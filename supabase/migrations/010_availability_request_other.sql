-- Allow coaches to create custom availability request types.
ALTER TABLE availability_requests
  DROP CONSTRAINT IF EXISTS availability_requests_request_type_check,
  ADD CONSTRAINT availability_requests_request_type_check
    CHECK (request_type IN ('match', 'training', 'other'));

ALTER TABLE availability_requests
  ADD COLUMN IF NOT EXISTS custom_request_type TEXT;
