-- Create referrals table to track user invitations
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_referral UNIQUE (invited_user_id),
  CONSTRAINT no_self_referral CHECK (inviter_user_id != invited_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view referrals where they are the inviter
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (auth.uid() = inviter_user_id);

-- System can insert referrals (via trigger)
CREATE POLICY "Allow insert for authenticated users" 
ON public.referrals 
FOR INSERT 
WITH CHECK (auth.uid() = invited_user_id);

-- Create index for faster lookups
CREATE INDEX idx_referrals_inviter ON public.referrals(inviter_user_id);
CREATE INDEX idx_referrals_invited ON public.referrals(invited_user_id);