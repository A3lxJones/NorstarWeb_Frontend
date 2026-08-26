-- ─────────────────────────────────────────────────────────────
-- 011: Retire date_of_birth + drop 'tentative' availability
-- ─────────────────────────────────────────────────────────────

-- Date of birth is no longer collected anywhere in the app.
-- Made nullable so inserts succeed without it. Drop the column
-- manually once you're happy the data is no longer needed:
--   ALTER TABLE children DROP COLUMN date_of_birth;
ALTER TABLE children ALTER COLUMN date_of_birth DROP NOT NULL;

-- Availability answers are now definite only: available / unavailable.
UPDATE availability SET status = 'unavailable' WHERE status = 'tentative';
UPDATE availability_responses SET status = 'unavailable' WHERE status = 'tentative';

ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_status_check;
ALTER TABLE availability
  ADD CONSTRAINT availability_status_check
  CHECK (status IN ('available', 'unavailable'));

ALTER TABLE availability_responses DROP CONSTRAINT IF EXISTS availability_responses_status_check;
ALTER TABLE availability_responses
  ADD CONSTRAINT availability_responses_status_check
  CHECK (status IN ('available', 'unavailable'));
