-- Supabase SQL: player_registrations + registration_notifications + team_managers
-- Run this in Supabase SQL editor (or via psql) as a privileged user (service_role) only.

-- Enable uuid gen if missing
create extension if not exists "pgcrypto";

-- Optional: team managers table (email list of people who should receive notifications)
create table if not exists public.team_managers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text,
  created_at timestamptz default now()
);

-- Player registrations table
create table if not exists public.player_registrations (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid references auth.users(id),
  submitter_email text,
  player_email text not null,
  player_name text not null,
  player_dob date,
  form_date date default current_date,
  nominated_person_email text,
  nominated_person_name text,
  nominated_person_relationship text,
  nominated_person_address text,
  nominated_person_phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  ice_hockey_experience boolean,
  gp text,
  medical_conditions text,
  dietary_requirements text,
  allergies text,
  photo_permission boolean,
  inform_club_secretary boolean,
  medical_permission boolean,
  emergency_hospital_treatment boolean,
  policies_ack boolean,
  parental_consent boolean,
  other_medical text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Notifications table for coaches/managers (in-app). External email sending should be handled by a worker that reads these rows.
create table if not exists public.registration_notifications (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.player_registrations(id) on delete cascade,
  recipient_email text not null,
  payload jsonb default '{}'::jsonb,
  sent boolean default false,
  read boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security: enable for player_registrations
alter table public.player_registrations enable row level security;

-- Allow authenticated users to insert their own submissions (server should prefer service role)
create policy allow_insert_authenticated on public.player_registrations
  for insert using (auth.role() = 'authenticated');

-- Allow owners (submitter_id) or service_role or managers to select
create policy select_for_owners_managers on public.player_registrations
  for select using (
    auth.role() = 'service_role' OR
    (auth.role() = 'authenticated' AND (submitter_id = auth.uid())) OR
    exists (select 1 from public.team_managers tm where tm.email = auth.jwt() ->> 'email')
  );

-- Only service_role may update/delete (API should not allow clients to alter records)
create policy manage_by_service_role on public.player_registrations
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- RLS for notifications: only service_role and recipient may select
alter table public.registration_notifications enable row level security;
create policy notifications_select on public.registration_notifications
  for select using (
    auth.role() = 'service_role' OR
    (auth.role() = 'authenticated' AND (auth.jwt() ->> 'email') = recipient_email)
  );
create policy notifications_insert_service on public.registration_notifications
  for insert using (auth.role() = 'service_role');
create policy notifications_manage_service on public.registration_notifications
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Seed club secretary (example)
insert into public.team_managers (email, name, role)
values ('info.norstarhockey@gmail.com', 'Club Secretary', 'club_secretary')
on conflict (email) do nothing;

-- NOTE: After applying this migration, configure a server-side worker (or use Supabase Edge Function)
-- to send emails using an SMTP/provider (SendGrid/Postmark). The worker should read registration_notifications
-- where sent = false, attempt delivery, then set sent = true on success.
