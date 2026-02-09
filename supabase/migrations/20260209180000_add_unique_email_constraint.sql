-- Add unique constraint to email in profiles table
-- This prevents duplicate email addresses at the database level

-- First, remove any existing duplicates (keep the first record)
DELETE FROM profiles 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM profiles 
  GROUP BY email 
  HAVING COUNT(*) > 1
);

-- Add unique constraint
ALTER TABLE profiles 
ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Add index for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
