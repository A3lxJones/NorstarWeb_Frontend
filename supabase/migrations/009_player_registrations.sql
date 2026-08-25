-- 009_player_registrations.sql
-- Add player_registrations and registration_notifications (MVP)
-- Designed to match existing project migration conventions (uuid-ossp, profiles).

-- Player registrations table
CREATE TABLE IF NOT EXISTS player_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  submitter_email TEXT,
  player_email TEXT NOT NULL,
  player_name TEXT NOT NULL,
  player_dob DATE,
  form_date DATE DEFAULT CURRENT_DATE,
  nominated_person_email TEXT,
  nominated_person_name TEXT,
  nominated_person_relationship TEXT,
  nominated_person_address TEXT,
  nominated_person_phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  ice_hockey_experience BOOLEAN,
  gp TEXT,
  medical_conditions TEXT,
  dietary_requirements TEXT,
  allergies TEXT,
  photo_permission BOOLEAN,
  inform_club_secretary BOOLEAN,
  medical_permission BOOLEAN,
  emergency_hospital_treatment BOOLEAN,
  policies_ack BOOLEAN,
  parental_consent BOOLEAN,
  other_medical TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_registrations_submitter ON player_registrations(submitter_id);
CREATE INDEX idx_player_registrations_created ON player_registrations(created_at);

-- Notifications table (for in-app MVP; emailing omitted)
CREATE TABLE IF NOT EXISTS registration_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID REFERENCES player_registrations(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  sent BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security for new tables
ALTER TABLE player_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_notifications ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies: allow inserts from authenticated users (server will generally use service role)
CREATE POLICY "Allow authenticated insert registrations"
  ON player_registrations FOR INSERT
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow submitter select or role coach/admin"
  ON player_registrations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    OR submitter_id = auth.uid()
  );

-- Registrations should only be modified by service role (backend)
CREATE POLICY "Manage registrations by service role" ON player_registrations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Notifications policies: recipient or service_role can select
CREATE POLICY "Notifications select recipient or service" ON registration_notifications
  FOR SELECT USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') = recipient_email);
CREATE POLICY "Notifications insert service role" ON registration_notifications
  FOR INSERT USING (auth.role() = 'service_role');
CREATE POLICY "Notifications manage by service role" ON registration_notifications
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Optional: seed a default team manager if not present (replace or remove as desired)
INSERT INTO public.team_managers (email, name, role)
SELECT 'info.norstarhockey@gmail.com', 'Club Secretary', 'club_secretary'
WHERE NOT EXISTS (SELECT 1 FROM public.team_managers WHERE email = 'info.norstarhockey@gmail.com');
