-- ============================================================
-- Allow coaches to update skill_level and position for
-- children registered (approved) in their teams.
-- ============================================================

CREATE POLICY "Coaches can update children in their teams"
  ON children FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM team_registrations tr
      JOIN teams t ON t.id = tr.team_id
      WHERE tr.child_id = children.id
        AND tr.status = 'approved'
        AND t.coach_id = auth.uid()
    )
  );
