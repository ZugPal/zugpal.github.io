-- Zugpal: host mode for the weekly Talk Train and a partner dashboard with aggregated numbers only.
-- * Counts per Talk Train ride are kept as plain numbers (no user ids, no check-in history):
--   participants (+1 when someone checks in to the ride) and matches (+1 when a wave is returned).
-- * Hosts unlock with a host code (stored hashed); they see numbers for a Talk Train and may send ONE announcement per ride.
-- * Partners open partner/dashboard.html with a partner code (stored hashed); any group smaller than 20 is hidden.
-- Codes are added by hand, never in this file:  insert into private.host_codes values (extensions.crypt('<code>', extensions.gen_salt('bf')), 'label');
-- Safe to re-run.

create table if not exists private.host_codes (code_hash text primary key, label text not null);
create table if not exists private.partner_codes (code_hash text primary key, label text not null);
create table if not exists private.ride_counts (ride_key text primary key, day date not null, participants int not null default 0, matches int not null default 0);
create table if not exists public.hosts (user_id uuid primary key references auth.users on delete cascade, until timestamptz not null);
alter table public.hosts enable row level security;
create table if not exists public.announcements (
  ride_key text primary key, body text not null check (char_length(body) between 1 and 280),
  created_by uuid references auth.users on delete set null, created_at timestamptz not null default now());
alter table public.announcements enable row level security;
alter table public.ride_moods add column if not exists recommend boolean;

-- Counting (triggers run as the table owner; they only write numbers)
create or replace function private.count_checkin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ride_key like 'TALK-%' and (tg_op = 'INSERT' or old.ride_key is distinct from new.ride_key) then
    insert into private.ride_counts(ride_key, day, participants) values (new.ride_key, coalesce(substring(new.ride_key from 6)::date, current_date), 1)
      on conflict (ride_key) do update set participants = private.ride_counts.participants + 1;
  end if;
  return new;
end $$;
drop trigger if exists count_checkin on public.riders;
create trigger count_checkin after insert or update of ride_key on public.riders for each row execute function private.count_checkin();

create or replace function private.count_match() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ride_key like 'TALK-%' and exists (select 1 from public.waves w where w.from_id = new.to_id and w.to_id = new.from_id and w.ride_key = new.ride_key) then
    insert into private.ride_counts(ride_key, day, matches) values (new.ride_key, coalesce(substring(new.ride_key from 6)::date, current_date), 1)
      on conflict (ride_key) do update set matches = private.ride_counts.matches + 1;
  end if;
  return new;
end $$;
drop trigger if exists count_match on public.waves;
create trigger count_match after insert on public.waves for each row execute function private.count_match();

-- Host mode
create or replace function private.is_host(u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.hosts h where h.user_id = u and h.until > now());
$$;
create or replace function public.become_host(p_code text) returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_until timestamptz := now() + interval '30 days';
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform pg_sleep(1);   -- slows down guessing
  if not exists (select 1 from private.host_codes c where c.code_hash = extensions.crypt(p_code, c.code_hash)) then raise exception 'wrong code'; end if;
  insert into public.hosts(user_id, until) values (auth.uid(), v_until) on conflict (user_id) do update set until = excluded.until;
  return v_until;
end $$;
create or replace function public.am_host() returns boolean language sql stable security definer set search_path = public as $$
  select private.is_host(auth.uid());
$$;
create or replace function public.host_ride_stats(p_ride text)
returns table (checked_in int, open_now int, matches int, announced boolean) language plpgsql stable security definer set search_path = public as $$
begin
  if not private.is_host(auth.uid()) or p_ride not like 'TALK-%' then raise exception 'hosts only'; end if;
  return query select
    (select count(*)::int from riders r where r.ride_key = p_ride and r.expires_at > now()),
    (select count(*)::int from riders r where r.ride_key = p_ride and r.expires_at > now() and r.is_open),
    coalesce((select c.matches from private.ride_counts c where c.ride_key = p_ride), 0),
    exists (select 1 from announcements a where a.ride_key = p_ride);
end $$;
create or replace function public.host_announce(p_ride text, p_body text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_host(auth.uid()) or p_ride not like 'TALK-%' then raise exception 'hosts only'; end if;
  insert into announcements(ride_key, body, created_by) values (p_ride, left(trim(p_body), 280), auth.uid());   -- fails if this ride already has one
end $$;
create or replace function public.ride_announcement() returns text language sql stable security definer set search_path = public as $$
  select a.body from announcements a join riders r on r.ride_key = a.ride_key where r.id = auth.uid() and r.expires_at > now();
$$;

-- Partner dashboard: aggregated numbers, groups under 20 hidden
create or replace function public.partner_stats(p_code text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform pg_sleep(1);
  if not exists (select 1 from private.partner_codes c where c.code_hash = extensions.crypt(p_code, c.code_hash)) then raise exception 'wrong code'; end if;
  with moods as (
    select created_at::date as day, count(*) as n,
           avg(mood_before) filter (where mood_before is not null) as before, count(mood_before) as n_before,
           avg(mood_after) filter (where mood_after is not null) as after, count(mood_after) as n_after,
           count(*) filter (where recommend) as rec_yes, count(recommend) as rec_n
    from ride_moods where ride_key = 'TALK' group by 1),
  rides as (
    select c.day, c.participants, c.matches, m.before, m.n_before, m.after, m.n_after, m.rec_yes, m.rec_n
    from private.ride_counts c left join moods m on m.day = c.day)
  select jsonb_build_object(
    'rides', coalesce(jsonb_agg(jsonb_build_object(
        'day', day,
        'participants', case when participants >= 20 then participants end,
        'matches', case when participants >= 20 then matches end,
        'mood_before', case when n_before >= 20 then round(before, 2) end,
        'mood_after', case when n_after >= 20 then round(after, 2) end,
        'recommend_pct', case when rec_n >= 20 then round(100.0 * rec_yes / rec_n) end,
        'answers', case when rec_n >= 20 then rec_n end) order by day), '[]'::jsonb),
    'totals', (select jsonb_build_object(
        'rides', count(*), 'participants', case when sum(participants) >= 20 then sum(participants) end,
        'matches', case when sum(participants) >= 20 then sum(matches) end) from private.ride_counts),
    'mood_totals', (select jsonb_build_object(
        'mood_before', case when count(mood_before) >= 20 then round(avg(mood_before), 2) end,
        'mood_after', case when count(mood_after) >= 20 then round(avg(mood_after), 2) end,
        'recommend_pct', case when count(recommend) >= 20 then round(100.0 * count(*) filter (where recommend) / count(recommend)) end,
        'answers', case when count(*) >= 20 then count(*) end) from ride_moods where ride_key = 'TALK'),
    'min_group', 20, 'generated', now())
  into v from rides;
  return v;
end $$;

revoke all on function private.is_host(uuid), private.count_checkin(), private.count_match() from public, anon, authenticated;
revoke all on function public.become_host(text), public.am_host(), public.host_ride_stats(text), public.host_announce(text, text),
  public.ride_announcement(), public.partner_stats(text) from public, anon;
grant execute on function public.become_host(text), public.am_host(), public.host_ride_stats(text), public.host_announce(text, text),
  public.ride_announcement() to authenticated;
grant execute on function public.partner_stats(text) to anon, authenticated;   -- needs the partner code
