
-- Add unique constraint on phone_number in profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_number_unique UNIQUE (phone_number);

-- Add admin SELECT policy on referrals so admins can see ALL referrals
CREATE POLICY "Admins can view all referrals"
ON public.referrals
FOR SELECT
USING (public.is_admin());
