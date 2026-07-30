-- ─── Drills Library ──────────────────────────────────────────
-- Stores coaching drills that coaches & admins can browse.
-- Uses arrays (text[]) for list-type fields so the API can
-- return them directly as JSON arrays.
--
-- The table may already exist with a different schema, so we
-- create it only if missing, then ADD any columns that are absent.

CREATE TABLE IF NOT EXISTS drills (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    category        text NOT NULL DEFAULT 'General',
    difficulty      text NOT NULL DEFAULT 'Beginner',
    duration_minutes integer NOT NULL DEFAULT 15,
    min_players     integer NOT NULL DEFAULT 2,
    max_players     integer NOT NULL DEFAULT 20,
    equipment       text[] NOT NULL DEFAULT '{}',
    description     text,
    objectives      text[] NOT NULL DEFAULT '{}',
    setup           text,
    instructions    text[] NOT NULL DEFAULT '{}',
    coaching_points text[] NOT NULL DEFAULT '{}',
    variations      text[] NOT NULL DEFAULT '{}',
    suitable_for    text[] NOT NULL DEFAULT '{}',
    team_id         uuid REFERENCES teams(id) ON DELETE SET NULL,
    created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- If the table already existed, ensure every expected column is present.
ALTER TABLE drills ADD COLUMN IF NOT EXISTS name             text;
ALTER TABLE drills ADD COLUMN IF NOT EXISTS category         text NOT NULL DEFAULT 'General';
ALTER TABLE drills ADD COLUMN IF NOT EXISTS difficulty        text NOT NULL DEFAULT 'Beginner';
ALTER TABLE drills ADD COLUMN IF NOT EXISTS duration_minutes  integer NOT NULL DEFAULT 15;
ALTER TABLE drills ADD COLUMN IF NOT EXISTS min_players       integer NOT NULL DEFAULT 2;
ALTER TABLE drills ADD COLUMN IF NOT EXISTS max_players       integer NOT NULL DEFAULT 20;
ALTER TABLE drills ADD COLUMN IF NOT EXISTS equipment         text[] NOT NULL DEFAULT '{}';
ALTER TABLE drills ADD COLUMN IF NOT EXISTS description       text;
ALTER TABLE drills ADD COLUMN IF NOT EXISTS objectives        text[] NOT NULL DEFAULT '{}';
ALTER TABLE drills ADD COLUMN IF NOT EXISTS setup             text;
ALTER TABLE drills ADD COLUMN IF NOT EXISTS instructions      text[] NOT NULL DEFAULT '{}';
ALTER TABLE drills ADD COLUMN IF NOT EXISTS coaching_points   text[] NOT NULL DEFAULT '{}';
ALTER TABLE drills ADD COLUMN IF NOT EXISTS variations        text[] NOT NULL DEFAULT '{}';
ALTER TABLE drills ADD COLUMN IF NOT EXISTS suitable_for      text[] NOT NULL DEFAULT '{}';
ALTER TABLE drills ADD COLUMN IF NOT EXISTS team_id           uuid REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE drills ADD COLUMN IF NOT EXISTS created_by        uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE drills ADD COLUMN IF NOT EXISTS created_at        timestamptz NOT NULL DEFAULT now();
ALTER TABLE drills ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now();

-- Index for common filter queries
CREATE INDEX IF NOT EXISTS idx_drills_category   ON drills (category);
CREATE INDEX IF NOT EXISTS idx_drills_difficulty  ON drills (difficulty);
CREATE INDEX IF NOT EXISTS idx_drills_team_id     ON drills (team_id);

-- RLS (optional — the backend uses supabaseAdmin which bypasses RLS,
-- but this protects direct Supabase client access)
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches and admins can view drills' AND tablename = 'drills') THEN
        CREATE POLICY "Coaches and admins can view drills" ON drills FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches and admins can insert drills' AND tablename = 'drills') THEN
        CREATE POLICY "Coaches and admins can insert drills" ON drills FOR INSERT
            WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin')));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches and admins can update drills' AND tablename = 'drills') THEN
        CREATE POLICY "Coaches and admins can update drills" ON drills FOR UPDATE
            USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin')));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and drill creators can delete drills' AND tablename = 'drills') THEN
        CREATE POLICY "Admins and drill creators can delete drills" ON drills FOR DELETE
            USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;
