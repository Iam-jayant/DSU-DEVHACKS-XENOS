--- Function to process matches when a profile is verified
CREATE OR REPLACE FUNCTION process_verified_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role text;
  v_match_count integer;
BEGIN
  -- Only proceed if status changed to 'verified'
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    -- Get user role (donor or recipient)
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = NEW.user_id;

    -- Process based on user role
    IF v_user_role = 'donor' THEN
      -- Find matches for the new donor
      WITH potential_matches AS (
        SELECT
          r.user_id as recipient_id,
          NEW.user_id as donor_id,
          calculate_match_score(
            NEW.blood_group, r.blood_group,
            NEW.age, r.age,
            NEW.city, r.city,
            NEW.state, r.state,
            r.urgency_level,
            r.created_at
          ) as match_score,
          r.urgency_level
        FROM recipient_profiles r
        WHERE r.status = 'verified'
          AND r.organ_type = NEW.organ_type
          AND are_blood_groups_compatible(NEW.blood_group, r.blood_group)
      )
      INSERT INTO matches (recipient_id, donor_id, total_score, urgency_score, location_score, wait_time_score, age_gap_score, created_at)
      SELECT 
        recipient_id,
        donor_id,
        match_score.total_score,
        match_score.urgency_score,
        match_score.location_score,
        match_score.wait_time_score,
        match_score.age_gap_score,
        NOW()
      FROM potential_matches
      WHERE match_score.total_score >= 50; -- Only create matches above 50% compatibility

    ELSIF v_user_role = 'recipient' THEN
      -- Find matches for the new recipient
      WITH potential_matches AS (
        SELECT
          NEW.user_id as recipient_id,
          d.user_id as donor_id,
          calculate_match_score(
            d.blood_group, NEW.blood_group,
            d.age, NEW.age,
            d.city, NEW.city,
            d.state, NEW.state,
            NEW.urgency_level,
            NEW.created_at
          ) as match_score,
          NEW.urgency_level
        FROM donor_profiles d
        WHERE d.status = 'verified'
          AND d.organ_type = NEW.organ_type
          AND are_blood_groups_compatible(d.blood_group, NEW.blood_group)
      )
      INSERT INTO matches (recipient_id, donor_id, total_score, urgency_score, location_score, wait_time_score, age_gap_score, created_at)
      SELECT 
        recipient_id,
        donor_id,
        match_score.total_score,
        match_score.urgency_score,
        match_score.location_score,
        match_score.wait_time_score,
        match_score.age_gap_score,
        NOW()
      FROM potential_matches
      WHERE match_score.total_score >= 50; -- Only create matches above 50% compatibility
    END IF;

    -- Get number of matches created
    GET DIAGNOSTICS v_match_count = ROW_COUNT;

    -- Create notification if matches were found
    IF v_match_count > 0 THEN
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES (
        NEW.user_id,
        'match_found',
        CASE 
          WHEN v_user_role = 'donor' THEN 'Potential Recipients Found'
          ELSE 'Potential Donors Found'
        END,
        CASE 
          WHEN v_user_role = 'donor' THEN format('We found %s potential recipients that match your profile!', v_match_count)
          ELSE format('We found %s potential donors that match your needs!', v_match_count)
        END,
        false,
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger for donor profiles
DROP TRIGGER IF EXISTS trigger_donor_verified ON donor_profiles;
CREATE TRIGGER trigger_donor_verified
  AFTER UPDATE
  ON donor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION process_verified_profile();

-- Create or replace trigger for recipient profiles
DROP TRIGGER IF EXISTS trigger_recipient_verified ON recipient_profiles;
CREATE TRIGGER trigger_recipient_verified
  AFTER UPDATE
  ON recipient_profiles
  FOR EACH ROW
  EXECUTE FUNCTION process_verified_profile();

-- Function to create match notifications for both parties
CREATE OR REPLACE FUNCTION notify_match_parties()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify donor
  INSERT INTO notifications (user_id, type, title, message, is_read, metadata, created_at)
  VALUES (
    NEW.donor_id,
    'new_match',
    'New Match Found',
    format('You have been matched with a recipient with a compatibility score of %s%%', round(NEW.total_score)),
    false,
    jsonb_build_object('match_id', NEW.id, 'score', NEW.total_score),
    NOW()
  );

  -- Notify recipient
  INSERT INTO notifications (user_id, type, title, message, is_read, metadata, created_at)
  VALUES (
    NEW.recipient_id,
    'new_match',
    'New Match Found',
    format('You have been matched with a donor with a compatibility score of %s%%', round(NEW.total_score)),
    false,
    jsonb_build_object('match_id', NEW.id, 'score', NEW.total_score),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger for new matches
DROP TRIGGER IF EXISTS trigger_notify_match ON matches;
CREATE TRIGGER trigger_notify_match
  AFTER INSERT
  ON matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_match_parties();