-- ============================================================
-- Availability Requests & Responses
-- Coaches can request parents to confirm availability for
-- upcoming matches or training sessions.
-- ============================================================

-- ─── Availability Requests ──────────────────────────────────
CREATE TABLE availability_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('match', 'training')),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  location TEXT,
  message TEXT,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_availability_requests_team ON availability_requests(team_id);
CREATE INDEX idx_availability_requests_date ON availability_requests(event_date);
CREATE INDEX idx_availability_requests_status ON availability_requests(status);
CREATE INDEX idx_availability_requests_created_by ON availability_requests(created_by);

-- ─── Availability Responses ─────────────────────────────────
-- Each parent responds per-child. One response per child per request.
CREATE TABLE availability_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES availability_requests(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'tentative')),
  reason TEXT,
  responded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, child_id)
);

CREATE INDEX idx_availability_responses_request ON availability_responses(request_id);
CREATE INDEX idx_availability_responses_child ON availability_responses(child_id);
CREATE INDEX idx_availability_responses_responded_by ON availability_responses(responded_by);

-- ─── Row Level Security ─────────────────────────────────────
ALTER TABLE availability_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_responses ENABLE ROW LEVEL SECURITY;

-- Availability Requests policies
CREATE POLICY "Everyone can view availability requests"
  ON availability_requests FOR SELECT
  USING (true);

CREATE POLICY "Coaches and admins can create availability requests"
  ON availability_requests FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

CREATE POLICY "Coaches and admins can update availability requests"
  ON availability_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

CREATE POLICY "Coaches and admins can delete availability requests"
  ON availability_requests FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- Availability Responses policies
CREATE POLICY "Parents can view responses for their children"
  ON availability_responses FOR SELECT
  USING (responded_by = auth.uid());

CREATE POLICY "Coaches and admins can view all responses"
  ON availability_responses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

CREATE POLICY "Parents can create responses for their children"
  ON availability_responses FOR INSERT
  WITH CHECK (responded_by = auth.uid());

CREATE POLICY "Parents can update their own responses"
  ON availability_responses FOR UPDATE
  USING (responded_by = auth.uid());

CREATE POLICY "Parents can delete their own responses"
  ON availability_responses FOR DELETE
  USING (responded_by = auth.uid());
