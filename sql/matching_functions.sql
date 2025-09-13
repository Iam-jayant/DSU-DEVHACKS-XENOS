-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES recipient_profiles(id),
  donor_id UUID REFERENCES donor_profiles(id),
  score DECIMAL NOT NULL,
  urgency_score DECIMAL NOT NULL,
  location_score DECIMAL NOT NULL,
  wait_time_score DECIMAL NOT NULL,
  age_gap_score DECIMAL NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(recipient_id, donor_id)
);

-- Function to notify new matches
CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify recipient of new match
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message
  )
  SELECT 
    rp.user_id,
    'match_found',
    'New Potential Match Found!',
    'A new potential donor match has been found for you. Please check your dashboard.'
  FROM recipient_profiles rp
  WHERE rp.id = NEW.recipient_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new matches
CREATE OR REPLACE TRIGGER trigger_new_match
  AFTER INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_match();

-- Function to auto-run matching when new donor is verified
CREATE OR REPLACE FUNCTION auto_run_matching()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger matching if donor is newly verified
  IF (NEW.status = 'verified' AND OLD.status != 'verified') THEN
    -- Call matching function here (will be handled by Edge Functions)
    -- We'll implement this in Supabase Edge Functions
    PERFORM http_post(
      'https://<your-project>.supabase.co/functions/v1/run-matching',
      '{"donor_id": "' || NEW.id || '"}'::jsonb,
      'application/json'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-matching
CREATE OR REPLACE TRIGGER trigger_auto_matching
  AFTER UPDATE ON donor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_run_matching();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_donor_profiles_status ON donor_profiles(status);
CREATE INDEX IF NOT EXISTS idx_recipient_profiles_status ON recipient_profiles(status);
CREATE INDEX IF NOT EXISTS idx_matches_recipient_id ON matches(recipient_id);
CREATE INDEX IF NOT EXISTS idx_matches_donor_id ON matches(donor_id);