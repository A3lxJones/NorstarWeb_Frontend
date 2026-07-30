-- ============================================================
-- Calendar Events
-- 1. Global calendar events (announcements, club events)
--    created by coaches/admins, visible to everyone.
-- 2. Auto-populated from availability_requests so the
--    interactive calendar picks them up automatically.
-- 3. Automatic cleanup of past events older than 1 month.
-- ============================================================

-- ─── Calendar Events table ──────────────────────────────────
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- NULL = global (visible to everyone). Set = team-specific.
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- If this event was auto-created from an availability request
  availability_request_id UUID REFERENCES availability_requests(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  end_time TIME,
  location TEXT,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'match', 'training', 'announcement', 'meeting', 'social', 'other'
  )),

  -- 'auto' = created from availability_request, 'manual' = created directly
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('auto', 'manual')),

  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX idx_calendar_events_team ON calendar_events(team_id);
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_events_avail_req ON calendar_events(availability_request_id);

-- ─── Row Level Security ─────────────────────────────────────
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Everyone can view calendar events (global + their teams)
CREATE POLICY "Everyone can view calendar events"
  ON calendar_events FOR SELECT
  USING (true);

-- Coaches and admins can create calendar events
CREATE POLICY "Coaches and admins can create calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- Coaches and admins can update calendar events
CREATE POLICY "Coaches and admins can update calendar events"
  ON calendar_events FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- Coaches and admins can delete calendar events
CREATE POLICY "Coaches and admins can delete calendar events"
  ON calendar_events FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- ─── Trigger: Auto-create calendar event from availability_request ──
CREATE OR REPLACE FUNCTION public.auto_create_calendar_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.calendar_events (
    team_id,
    availability_request_id,
    title,
    description,
    event_date,
    event_time,
    location,
    event_type,
    source,
    created_by
  ) VALUES (
    NEW.team_id,
    NEW.id,
    NEW.title,
    NEW.message,
    NEW.event_date,
    NEW.event_time,
    NEW.location,
    NEW.request_type,  -- 'match' or 'training'
    'auto',
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_availability_request_created
  AFTER INSERT ON availability_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_calendar_event();

-- ─── Trigger: Keep calendar event in sync when request is updated ──
CREATE OR REPLACE FUNCTION public.sync_calendar_event_on_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.calendar_events
  SET
    title = NEW.title,
    description = NEW.message,
    event_date = NEW.event_date,
    event_time = NEW.event_time,
    location = NEW.location,
    event_type = NEW.request_type,
    updated_at = NOW()
  WHERE availability_request_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_availability_request_updated
  AFTER UPDATE ON availability_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_calendar_event_on_update();

-- ─── Function: Cleanup past events older than 1 month ───────
-- Call this via a Supabase cron job or from the API.
CREATE OR REPLACE FUNCTION public.cleanup_old_calendar_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete calendar events older than 1 month
  DELETE FROM calendar_events
  WHERE event_date < (CURRENT_DATE - INTERVAL '1 month');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Also close availability_requests whose event_date has passed
  UPDATE availability_requests
  SET status = 'closed', updated_at = NOW()
  WHERE event_date < CURRENT_DATE
    AND status = 'open';

  -- Delete availability_requests older than 1 month
  DELETE FROM availability_requests
  WHERE event_date < (CURRENT_DATE - INTERVAL '1 month');

  -- Delete old availability records older than 1 month
  DELETE FROM availability
  WHERE event_date < (CURRENT_DATE - INTERVAL '1 month');

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Backfill: Create calendar events for existing requests ─
INSERT INTO calendar_events (
  team_id, availability_request_id, title, description,
  event_date, event_time, location, event_type, source, created_by
)
SELECT
  ar.team_id, ar.id, ar.title, ar.message,
  ar.event_date, ar.event_time, ar.location,
  ar.request_type, 'auto', ar.created_by
FROM availability_requests ar
WHERE ar.event_date >= (CURRENT_DATE - INTERVAL '1 month')
  AND NOT EXISTS (
    SELECT 1 FROM calendar_events ce WHERE ce.availability_request_id = ar.id
  );
