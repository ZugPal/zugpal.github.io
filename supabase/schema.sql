-- Zugpal database setup (full current state). For a new project: paste everything into Supabase > SQL Editor > New query,
-- then press Run once. Safe to re-run. Changes to the live project go through supabase/migrations/.

create table if not exists public.riders (
  id uuid primary key references auth.users on delete cascade,
  ride_key text not null,
  first_name text not null check (char_length(first_name) between 1 and 30),
  gender text not null check (gender in ('woman','man','other')),
  age_range text,
  languages text[] not null default '{}',
  topics text[] not null default '{}',
  ask_me text check (ask_me is null or char_length(ask_me) <= 60),
  photo_small text check (photo_small is null or char_length(photo_small) <= 4000),
  photo text check (photo is null or char_length(photo) <= 90000),
  moods text[] not null default '{}',
  women_only boolean not null default false,
  chat_only boolean not null default false,
  coach text check (coach is null or char_length(coach) <= 4),
  is_open boolean not null default true,
  lang text,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.riders add column if not exists accept_photos boolean not null default true;
alter table public.riders add column if not exists seen_at timestamptz;
alter table public.riders add column if not exists active_game text check (active_game is null or char_length(active_game) <= 20);

create table if not exists public.waves (
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  ride_key text not null,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id, ride_key)
);
create table if not exists public.blocks (
  blocker uuid not null references auth.users on delete cascade,
  blocked uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null default auth.uid() references auth.users on delete cascade,
  reported uuid not null references auth.users on delete cascade,
  ride_key text, reason text,
  created_at timestamptz not null default now()
);
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  ride_key text not null,
  from_id uuid not null default auth.uid() references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create table if not exists public.compliments (
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  badge text not null check (badge in ('listener','funny','german','kind','stories')),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id, badge)
);
create table if not exists public.buddies (
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id)
);
create table if not exists public.ride_moods (
  id bigint generated always as identity primary key,
  ride_key text,
  mood_before smallint check (mood_before between 1 and 5),
  mood_after smallint check (mood_after between 1 and 5),
  matched boolean,
  created_at timestamptz not null default now()
);
-- View-once photos and play-once voice messages
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  ride_key text not null,
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('photo','voice')),
  data text,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  reported boolean not null default false);
alter table public.media_items drop constraint if exists media_items_data_check;
alter table public.media_items add constraint media_items_data_check check (data is null or char_length(data) <= 1500000);

alter table public.riders enable row level security;
alter table public.waves enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.messages enable row level security;
alter table public.compliments enable row level security;
alter table public.buddies enable row level security;
alter table public.ride_moods enable row level security;
alter table public.media_items enable row level security;
-- No direct access to media_items: only through the functions below.

-- Helpers run with full rights, so they live in a private schema the API does not expose
-- (otherwise anyone could ask "did X and Y match?" or "did X block Y?").
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Who may see whom: same train, both open, not expired, women-only respected, nobody blocked
create or replace function private.can_see(a public.riders, b public.riders)
returns boolean language sql stable security definer set search_path = public as $$
  select a.id <> b.id and a.ride_key = b.ride_key and a.is_open and b.is_open
     and a.expires_at > now() and b.expires_at > now()
     and (not a.women_only or b.gender = 'woman') and (not b.women_only or a.gender = 'woman')
     and not exists (select 1 from public.blocks k
                     where (k.blocker = a.id and k.blocked = b.id) or (k.blocker = b.id and k.blocked = a.id));
$$;

create or replace function private.is_match(x uuid, y uuid, rk text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.riders a join public.riders b on b.id = y
    where a.id = x and a.ride_key = rk and private.can_see(a, b)
      and exists (select 1 from public.waves w where w.from_id = x and w.to_id = y and w.ride_key = rk)
      and exists (select 1 from public.waves w where w.from_id = y and w.to_id = x and w.ride_key = rk));
$$;

create or replace function private.had_match(x uuid, y uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.waves a join public.waves b
                 on b.from_id = y and b.to_id = x and b.ride_key = a.ride_key
                 where a.from_id = x and a.to_id = y);
$$;

revoke all on function private.can_see(public.riders, public.riders), private.is_match(uuid, uuid, text),
  private.had_match(uuid, uuid) from public, anon;
grant execute on function private.can_see(public.riders, public.riders), private.is_match(uuid, uuid, text),
  private.had_match(uuid, uuid) to authenticated;

-- Everyone only touches their own rows
drop policy if exists riders_own on public.riders;
create policy riders_own on public.riders for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and (not women_only or gender = 'woman') and expires_at < now() + interval '4 hours');

drop policy if exists waves_read on public.waves;
drop policy if exists waves_delete on public.waves;
drop policy if exists waves_insert on public.waves;
drop policy if exists waves_update on public.waves;
create policy waves_read on public.waves for select to authenticated using (from_id = auth.uid());
create policy waves_delete on public.waves for delete to authenticated using (from_id = auth.uid());
create policy waves_insert on public.waves for insert to authenticated
  with check (from_id = auth.uid()
    and (select count(*) from public.waves w where w.from_id = auth.uid() and w.ride_key = waves.ride_key) < 5);
create policy waves_update on public.waves for update to authenticated
  using (from_id = auth.uid()) with check (from_id = auth.uid());

drop policy if exists blocks_own on public.blocks;
create policy blocks_own on public.blocks for all to authenticated
  using (blocker = auth.uid()) with check (blocker = auth.uid());

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check (reporter = auth.uid());

drop policy if exists messages_read on public.messages;
drop policy if exists messages_send on public.messages;
drop policy if exists messages_delete_own on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
create policy messages_send on public.messages for insert to authenticated
  with check (from_id = auth.uid() and private.is_match(auth.uid(), to_id, ride_key));
create policy messages_delete_own on public.messages for delete to authenticated using (from_id = auth.uid());

drop policy if exists compliments_give on public.compliments;
drop policy if exists compliments_own on public.compliments;
create policy compliments_give on public.compliments for insert to authenticated
  with check (from_id = auth.uid() and private.had_match(auth.uid(), to_id));
create policy compliments_own on public.compliments for select to authenticated using (from_id = auth.uid());

drop policy if exists buddies_own on public.buddies;
create policy buddies_own on public.buddies for all to authenticated
  using (from_id = auth.uid()) with check (from_id = auth.uid() and private.had_match(auth.uid(), to_id));

drop policy if exists ride_moods_insert on public.ride_moods;
create policy ride_moods_insert on public.ride_moods for insert to authenticated with check (true);

-- People I may see on my train (small blurred photo, coach hidden)
drop function if exists public.visible_riders();
create function public.visible_riders()
returns table (id uuid, first_name text, ask_me text, age_range text, languages text[], topics text[], moods text[],
               chat_only boolean, same_coach boolean, waved boolean, photo_small text, badges jsonb, buddy boolean)
language sql stable security definer set search_path = public as $$
  select b.id, b.first_name, b.ask_me, b.age_range, b.languages, b.topics, b.moods, b.chat_only,
         (a.coach is not null and a.coach = b.coach),
         exists (select 1 from public.waves w where w.from_id = a.id and w.to_id = b.id and w.ride_key = a.ride_key),
         b.photo_small,
         (select coalesce(jsonb_object_agg(x.badge, x.n), '{}'::jsonb)
            from (select c.badge, count(*) as n from public.compliments c where c.to_id = b.id group by c.badge) x),
         (exists (select 1 from public.buddies k where k.from_id = a.id and k.to_id = b.id)
          and exists (select 1 from public.buddies k where k.from_id = b.id and k.to_id = a.id))
  from public.riders a join public.riders b on private.can_see(a, b)
  where a.id = auth.uid();
$$;

-- My mutual matches (full photo; coach only if neither chose chat only; presence for "Active now" / "in the game")
drop function if exists public.my_matches();
create function public.my_matches()
returns table (id uuid, first_name text, age_range text, languages text[], moods text[], chat_only boolean, coach text, photo text,
               accept_photos boolean, seen_at timestamptz, active_game text)
language sql stable security definer set search_path = public as $$
  select b.id, b.first_name, b.age_range, b.languages, b.moods, (a.chat_only or b.chat_only),
         case when a.chat_only or b.chat_only then null else b.coach end, b.photo, b.accept_photos, b.seen_at, b.active_game
  from public.riders a join public.riders b on private.can_see(a, b)
  where a.id = auth.uid() and private.is_match(a.id, b.id, a.ride_key);
$$;

create or replace function public.send_media(p_to uuid, p_ride text, p_kind text, p_data text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; me uuid := auth.uid();
begin
  if me is null or not private.is_match(me, p_to, p_ride) then raise exception 'not a match'; end if;
  if p_kind = 'photo' then
    if p_data !~ '^data:image/jpeg;base64,' then raise exception 'bad photo'; end if;
    if not coalesce((select r.accept_photos from riders r where r.id = p_to), false) then raise exception 'photos off'; end if;
    if (select count(*) from messages m where m.from_id = me and m.to_id = p_to and m.ride_key = p_ride and left(m.body,1) <> chr(1)) < 2
    or (select count(*) from messages m where m.from_id = p_to and m.to_id = me and m.ride_key = p_ride and left(m.body,1) <> chr(1)) < 2
    then raise exception 'photos locked'; end if;
  elsif p_kind = 'voice' then
    if p_data !~ '^data:audio/(wav|webm|mp4|ogg|aac|mpeg|x-m4a)' then raise exception 'bad audio'; end if;
  else raise exception 'bad kind'; end if;
  if (select count(*) from media_items x where x.from_id = me and x.created_at > now() - interval '1 hour') >= 30 then raise exception 'too many'; end if;
  delete from media_items x where x.created_at < now() - interval '24 hours' and not x.reported;
  insert into media_items(ride_key, from_id, to_id, kind, data) values (p_ride, me, p_to, p_kind, p_data) returning id into v_id;
  insert into messages(ride_key, from_id, to_id, body) values (p_ride, me, p_to, chr(1) || 'media:' || v_id || ':' || p_kind);
  return v_id;
end $$;

-- Opens a photo or voice message once. A second call returns nothing.
create or replace function public.open_media(p_id uuid)
returns table (media_kind text, media_data text) language plpgsql security definer set search_path = public as $$
begin
  return query
  update media_items x set opened_at = now()
  where x.id = p_id and x.to_id = auth.uid() and x.opened_at is null
    and x.data is not null and x.created_at > now() - interval '24 hours'
  returning x.kind, x.data;
end $$;

-- For the sender: was it opened yet?
create or replace function public.my_media_status(p_ride text)
returns table (id uuid, opened boolean) language sql stable security definer set search_path = public as $$
  select x.id, x.opened_at is not null from media_items x where x.from_id = auth.uid() and x.ride_key = p_ride;
$$;

-- Report within 24 hours: the file is kept for review and a report is filed.
create or replace function public.report_media(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_from uuid; v_ride text;
begin
  update media_items x set reported = true
  where x.id = p_id and x.to_id = auth.uid() and x.created_at > now() - interval '24 hours'
  returning x.from_id, x.ride_key into v_from, v_ride;
  if v_from is not null then
    insert into reports(reporter, reported, ride_key, reason) values (auth.uid(), v_from, v_ride, 'media ' || p_id);
  end if;
end $$;

-- Grants. The app always signs in (anonymously), so it uses the "authenticated" role.
-- Functions are revoked from PUBLIC too, because Postgres grants every new function to PUBLIC by default.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.riders, public.waves, public.blocks, public.messages,
  public.compliments, public.buddies to authenticated;
grant insert on public.reports, public.ride_moods to authenticated;
revoke all on function public.visible_riders(), public.my_matches(), public.send_media(uuid, text, text, text),
  public.open_media(uuid), public.my_media_status(text), public.report_media(uuid) from public, anon;
grant execute on function public.visible_riders(), public.my_matches(), public.send_media(uuid, text, text, text),
  public.open_media(uuid), public.my_media_status(text), public.report_media(uuid) to authenticated;

-- ===== Reports, notices and pauses (notice-and-action, DSA basics) =====

alter table public.reports add column if not exists reason_code text;
alter table public.reports drop constraint if exists reports_reason_code_check;
alter table public.reports add constraint reports_reason_code_check
  check (reason_code is null or reason_code in ('under18','harassment','hate','scam','contact','fake','other','comfort','media'));
alter table public.reports add column if not exists details text check (details is null or char_length(details) <= 500);
alter table public.reports add column if not exists evidence jsonb;
alter table public.reports add column if not exists status text not null default 'open';
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check check (status in ('open','action','no_action'));
alter table public.reports add column if not exists action text;
alter table public.reports add column if not exists decision text;
alter table public.reports add column if not exists decided_at timestamptz;

-- Messages from the Zugpal team to one user (confirmation, decision, removal, pause)
create table if not exists public.notices (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('received','decided_action','decided_none','removed','suspended')),
  report_id bigint references public.reports on delete set null,
  reason text check (reason is null or char_length(reason) <= 500),
  until timestamptz,
  created_at timestamptz not null default now(),
  seen_at timestamptz);
alter table public.notices enable row level security;
-- No direct access: only through my_notices() / notices_seen().

create table if not exists public.suspensions (
  user_id uuid primary key references auth.users on delete cascade,
  until timestamptz not null,
  reason text not null,
  created_at timestamptz not null default now());
alter table public.suspensions enable row level security;

create or replace function private.is_suspended(u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.suspensions s where s.user_id = u and s.until > now());
$$;
revoke all on function private.is_suspended(uuid) from public, anon;
grant execute on function private.is_suspended(uuid) to authenticated;

-- Paused accounts can't check in or write
drop policy if exists riders_own on public.riders;
create policy riders_own on public.riders for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and (not women_only or gender = 'woman') and expires_at < now() + interval '4 hours'
              and not private.is_suspended(auth.uid()));
drop policy if exists messages_send on public.messages;
create policy messages_send on public.messages for insert to authenticated
  with check (from_id = auth.uid() and private.is_match(auth.uid(), to_id, ride_key) and not private.is_suspended(auth.uid()));

-- File a report. Keeps a copy of the last 20 text messages between the two (chats are deleted after 24 h).
create or replace function public.file_report(p_reported uuid, p_ride text, p_reason text, p_details text)
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v_id bigint; v_ev jsonb;
begin
  if me is null or p_reported is null or p_reported = me then raise exception 'bad report'; end if;
  if p_reason is null or p_reason not in ('under18','harassment','hate','scam','contact','fake','other','comfort') then raise exception 'bad reason'; end if;
  if (select count(*) from reports r where r.reporter = me and r.created_at > now() - interval '1 hour') >= 10 then raise exception 'too many'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('from', case when m.from_id = me then 'reporter' else 'reported' end,
                                               'at', m.created_at, 'body', m.body) order by m.created_at), '[]'::jsonb)
    into v_ev
    from (select * from messages m where ((m.from_id = me and m.to_id = p_reported) or (m.from_id = p_reported and m.to_id = me))
            and left(m.body, 1) <> chr(1) order by m.created_at desc limit 20) m;
  insert into reports(reporter, reported, ride_key, reason, reason_code, details, evidence)
    values (me, p_reported, left(p_ride, 60), p_reason, p_reason, left(nullif(trim(p_details), ''), 500), v_ev)
    returning id into v_id;
  if p_reason <> 'comfort' then insert into notices(user_id, kind, report_id) values (me, 'received', v_id); end if;
  return v_id;
end $$;

create or replace function public.my_notices()
returns table (id bigint, kind text, report_id bigint, reason text, until timestamptz, created_at timestamptz, seen boolean)
language sql stable security definer set search_path = public as $$
  select n.id, n.kind, n.report_id, n.reason, n.until, n.created_at, n.seen_at is not null
  from notices n where n.user_id = auth.uid() and (n.seen_at is null or n.created_at > now() - interval '30 days')
  order by n.created_at desc limit 30;
$$;

create or replace function public.notices_seen(p_ids bigint[])
returns void language sql security definer set search_path = public as $$
  update notices set seen_at = now() where user_id = auth.uid() and id = any(p_ids) and seen_at is null;
$$;

revoke all on function public.file_report(uuid, text, text, text), public.my_notices(), public.notices_seen(bigint[]) from public, anon;
grant execute on function public.file_report(uuid, text, text, text), public.my_notices(), public.notices_seen(bigint[]) to authenticated;

-- Moderator decision. p_action: 'no_action' | 'remove' (delete what they sent the reporter) | 'pause_24h' | 'pause_7d' | 'ban'.
-- p_reason: plain words shown to the reported person, naming the rule, e.g. 'Regel 3: Keine Kontaktdaten weitergeben.'
create or replace function private.decide_report(p_id bigint, p_action text, p_reason text)
returns text language plpgsql security definer set search_path = public as $$
declare r public.reports; v_until timestamptz;
begin
  select * into r from reports where id = p_id;
  if r.id is null then raise exception 'no such report'; end if;
  if p_action not in ('no_action','remove','pause_24h','pause_7d','ban') then raise exception 'bad action'; end if;
  if p_action <> 'no_action' and coalesce(trim(p_reason), '') = '' then raise exception 'reason needed'; end if;
  update reports set status = case when p_action = 'no_action' then 'no_action' else 'action' end,
                     action = p_action, decision = p_reason, decided_at = now() where id = p_id;
  insert into notices(user_id, kind, report_id)
    values (r.reporter, case when p_action = 'no_action' then 'decided_none' else 'decided_action' end, p_id);
  if p_action = 'no_action' then return 'reporter informed'; end if;
  delete from messages m where m.from_id = r.reported and m.to_id = r.reporter;
  delete from media_items x where x.from_id = r.reported and x.to_id = r.reporter and not x.reported;
  if p_action = 'remove' then
    insert into notices(user_id, kind, report_id, reason) values (r.reported, 'removed', p_id, p_reason);
    return 'content removed, both informed';
  end if;
  v_until := case p_action when 'pause_24h' then now() + interval '24 hours' when 'pause_7d' then now() + interval '7 days'
                           else now() + interval '100 years' end;
  insert into suspensions(user_id, until, reason) values (r.reported, v_until, p_reason)
    on conflict (user_id) do update set until = greatest(suspensions.until, excluded.until), reason = excluded.reason;
  delete from riders where id = r.reported;
  insert into notices(user_id, kind, report_id, reason, until) values (r.reported, 'suspended', p_id, p_reason, v_until);
  return 'paused until ' || v_until || ', both informed';
end $$;
revoke all on function private.decide_report(bigint, text, text) from public, anon, authenticated;

-- Reports to review, newest and most urgent first (for the SQL editor)
create or replace view private.open_reports as
  select r.id, r.created_at, r.reason_code, (r.reason_code = 'under18') as urgent, r.details, r.ride_key,
         r.reporter, r.reported, jsonb_array_length(coalesce(r.evidence, '[]'::jsonb)) as messages_kept, r.evidence
  from public.reports r where r.status = 'open'
  order by (r.reason_code = 'under18') desc, r.created_at;
revoke all on private.open_reports from public, anon, authenticated;

-- ===== Automatic deletion (hourly) =====
create extension if not exists pg_cron;

create or replace function private.cleanup()
returns void language sql security definer set search_path = public as $$
  -- Check-ins: 1 hour after the ride ended
  delete from public.riders where expires_at < now() - interval '1 hour' and expires_at >= '2026-10-28';
  -- Chat messages: after 24 hours (rides last at most 4 hours)
  delete from public.messages where created_at < now() - interval '24 hours' and created_at >= '2026-10-28';
  -- Photos / voice: after 24 hours unless reported (reported ones stay for review, at most 6 months)
  delete from public.media_items where created_at < now() - interval '24 hours' and not reported and created_at >= '2026-10-28';
  delete from public.media_items where reported and created_at < now() - interval '6 months';
  -- Waves: after 7 days (needed shortly after a ride for badges and ride buddies)
  delete from public.waves where created_at < now() - interval '7 days' and created_at >= '2026-10-28';
  -- Reports and notices: 6 months; ended pauses: 30 days
  delete from public.reports where created_at < now() - interval '6 months';
  delete from public.notices where created_at < now() - interval '6 months';
  delete from public.suspensions where until < now() - interval '30 days';
$$;
revoke all on function private.cleanup() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'zugpal-cleanup';
select cron.schedule('zugpal-cleanup', '17 * * * *', 'select private.cleanup()');
