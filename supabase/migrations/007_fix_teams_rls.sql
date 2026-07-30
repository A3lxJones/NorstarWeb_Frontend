-- Fix teams table public access
-- Disable RLS on teams table since it's completely public
-- and should be accessible to anyone (with or without authentication)

ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
