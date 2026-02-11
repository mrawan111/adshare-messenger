-- Days counter must be hidden by default for all users.
ALTER TABLE public.user_preferences
ALTER COLUMN show_days_counter SET DEFAULT false;

-- Normalize existing rows to the new default.
UPDATE public.user_preferences
SET show_days_counter = false
WHERE show_days_counter IS DISTINCT FROM false;

-- Keep RPC-created preferences aligned with the default.
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
    VALUES (profile_uuid, false, true)
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
