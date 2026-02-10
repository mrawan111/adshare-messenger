-- Add user preferences table for individual user settings
CREATE TABLE user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  show_days_counter BOOLEAN DEFAULT true,
  show_referral_bonus BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id)
);

-- Add index for better performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at_trigger
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Create function to get or create user preferences
CREATE OR REPLACE FUNCTION get_or_create_user_preferences(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  show_days_counter BOOLEAN,
  show_referral_bonus BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Try to get existing preferences
  RETURN QUERY
  SELECT up.id, up.user_id, up.show_days_counter, up.show_referral_bonus, up.created_at, up.updated_at
  FROM user_preferences up
  WHERE up.user_id = user_uuid;
  
  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO user_preferences (user_id, show_days_counter, show_referral_bonus)
    VALUES (user_uuid, true, true)
    RETURNING id, user_id, show_days_counter, show_referral_bonus, created_at, updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;
