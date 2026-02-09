-- Add vodafone_cash column to profiles table
-- Migration: Add Vodafone Cash wallet number for rewards
ALTER TABLE profiles 
ADD COLUMN vodafone_cash VARCHAR(20);

-- Add comment for documentation
COMMENT ON COLUMN profiles.vodafone_cash IS 'Vodafone Cash wallet number for receiving rewards';
