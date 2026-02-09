-- Create a function to handle referral tracking on user signup
CREATE OR REPLACE FUNCTION public.handle_referral_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer_id uuid;
BEGIN
  -- Get the referral code from user metadata
  referrer_id := (NEW.raw_user_meta_data->>'referral_code')::uuid;
  
  -- If there's a valid referral code and it's not self-referral
  IF referrer_id IS NOT NULL AND referrer_id != NEW.id THEN
    -- Check if the referrer exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = referrer_id) THEN
      INSERT INTO public.referrals (inviter_user_id, invited_user_id)
      VALUES (referrer_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block user creation if referral tracking fails
    RETURN NEW;
END;
$$;

-- Create a trigger on auth.users to track referrals
DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_referral_on_signup();