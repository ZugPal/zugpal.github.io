-- Zugpal: server copy of the profile, only for people who saved their account with an email (optional magic-link login),
-- so the profile comes back on a new phone. Anonymous users keep their profile only on the phone. Safe to re-run.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  data jsonb not null check (pg_column_size(data) < 250000),
  updated_at timestamptz not null default now());
alter table public.profiles enable row level security;
drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
grant select, insert, update, delete on public.profiles to authenticated;
