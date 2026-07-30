-- ============================================================
-- Norstar Inline Hockey — Database Schema
-- Run this in the Supabase SQL Editor to set up all tables.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ───────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific data.
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'coach', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── Children ───────────────────────────────────────────────
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  medical_conditions TEXT,
  allergies TEXT,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_relationship TEXT NOT NULL,
  photo_consent BOOLEAN DEFAULT FALSE,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_children_parent ON children(parent_id);

-- ─── Teams ──────────────────────────────────────────────────
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  age_group TEXT NOT NULL,
  coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_coach ON teams(coach_id);

-- ─── Team Registrations ─────────────────────────────────────
CREATE TABLE team_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  registered_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, child_id)
);

CREATE INDEX idx_registrations_team ON team_registrations(team_id);
CREATE INDEX idx_registrations_child ON team_registrations(child_id);

-- ─── Games / Matches / Training ─────────────────────────────
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  opponent_name TEXT,
  location TEXT NOT NULL,
  game_date DATE NOT NULL,
  game_time TIME NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('league', 'friendly', 'tournament', 'training')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  home_score INTEGER,
  away_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_games_home_team ON games(home_team_id);
CREATE INDEX idx_games_date ON games(game_date);

-- ─── Availability ───────────────────────────────────────────
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  availability_type TEXT NOT NULL CHECK (availability_type IN ('match', 'training')),
  event_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'tentative')),
  reason TEXT,
  submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, event_date, availability_type)
);

CREATE INDEX idx_availability_child ON availability(child_id);
CREATE INDEX idx_availability_game ON availability(game_id);
CREATE INDEX idx_availability_date ON availability(event_date);

-- ─── Reports ────────────────────────────────────────────────
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('incident', 'feedback', 'general')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  related_child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  related_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_author ON reports(created_by);
CREATE INDEX idx_reports_type ON reports(report_type);

-- ============================================================
-- Row Level Security (RLS) Policies
-- These ensure data access is enforced at the database level,
-- even if the API has a bug.
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ─── Profiles policies ─────────────────────────────────────
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ─── Children policies ─────────────────────────────────────
CREATE POLICY "Parents can view their own children"
  ON children FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Coaches and admins can view all children"
  ON children FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

CREATE POLICY "Parents can insert their own children"
  ON children FOR INSERT
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update their own children"
  ON children FOR UPDATE
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can delete their own children"
  ON children FOR DELETE
  USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage all children"
  ON children FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Teams policies ────────────────────────────────────────
CREATE POLICY "Everyone can view teams"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Coaches and admins can manage teams"
  ON teams FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- ─── Team registrations policies ────────────────────────────
CREATE POLICY "Parents can view their registrations"
  ON team_registrations FOR SELECT
  USING (registered_by = auth.uid());

CREATE POLICY "Coaches and admins can view all registrations"
  ON team_registrations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

CREATE POLICY "Parents can create registrations"
  ON team_registrations FOR INSERT
  WITH CHECK (registered_by = auth.uid());

CREATE POLICY "Coaches and admins can update registrations"
  ON team_registrations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- ─── Games policies ────────────────────────────────────────
CREATE POLICY "Everyone can view games"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Coaches and admins can manage games"
  ON games FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- ─── Availability policies ─────────────────────────────────
CREATE POLICY "Parents can view their children's availability"
  ON availability FOR SELECT
  USING (submitted_by = auth.uid());

CREATE POLICY "Coaches and admins can view all availability"
  ON availability FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

CREATE POLICY "Parents can manage their children's availability"
  ON availability FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Parents can update their children's availability"
  ON availability FOR UPDATE
  USING (submitted_by = auth.uid());

CREATE POLICY "Parents can delete their children's availability"
  ON availability FOR DELETE
  USING (submitted_by = auth.uid());

-- ─── Reports policies ──────────────────────────────────────
CREATE POLICY "Admins can manage all reports"
  ON reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Coaches can create reports"
  ON reports FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Coaches can view their own reports"
  ON reports FOR SELECT
  USING (created_by = auth.uid());
