-- Allow inviters to read basic profile info for users they invited.
-- This unblocks name/phone rendering in /invite while keeping access scoped.
CREATE POLICY "Inviters can view invited user profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.referrals r
    WHERE r.inviter_user_id = auth.uid()
      AND r.invited_user_id = profiles.user_id
  )
);

-- Fix function: ensure insert branch returns a row for RPC consumers.
CREATE OR REPLACE FUNCTION public.get_or_create_user_preferences(profile_uuid UUID)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  show_days_counter BOOLEAN,
  show_referral_bonus BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT up.id, up.profile_id, up.show_days_counter, up.show_referral_bonus, up.created_at, up.updated_at
  FROM public.user_preferences up
  WHERE up.profile_id = profile_uuid;

  IF NOT FOUND THEN
    RETURN QUERY
    INSERT INTO public.user_preferences (profile_id, show_days_counter, show_referral_bonus)
    VALUES (profile_uuid, true, true)
    RETURNING
      user_preferences.id,
      user_preferences.profile_id,
      user_preferences.show_days_counter,
      user_preferences.show_referral_bonus,
      user_preferences.created_at,
      user_preferences.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;
