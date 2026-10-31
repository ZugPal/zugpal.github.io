-- 2026-10-31: trains people create ("my train", like a group) and one group chat per ride.
-- Ride keys: TALK-YYYY-MM-DD (Talk Train), LINE-NUMBER-DATE (any train), TEST-CODE (test ride),
-- and new TRAIN-CODE-YYYY-MM-DD for a created train. The group chat works for every ride key.
-- Safety: only riders checked in on the same ride read its group; blocked pairs never see each other;
-- contact details are refused by the database; 20 messages per minute at most; women-only trains only accept women;
-- at most 3 active trains per person; the creator (or a host on the Talk Train) can hide a group message.
-- Safe to re-run.

-- ---------- trains ----------
create table if not exists public.trains (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  label text not null check (char_length(label) between 2 and 60),
  line text check (line is null or char_length(line) <= 12),
  from_station text check (from_station is null or char_length(from_station) <= 40),
  to_station text check (to_station is null or char_length(to_station) <= 40),
  weekdays int[] check (weekdays is null or (cardinality(weekdays) between 1 and 7 and weekdays <@ array[1,2,3,4,5,6,7])),
  one_date date,
  dep_time time not null,
  minutes int not null default 45 check (minutes between 10 and 240),
  coach text check (coach is null or char_length(coach) <= 4),
  theme text not null default 'talk' check (theme in ('talk','german','games','books')),
  women_only boolean not null default false,
  featured boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  ends_on date,
  check (weekdays is not null or one_date is not null)
);
alter table public.trains enable row level security;

create or replace function private.train_defaults() returns trigger language plpgsql set search_path = public as $$
begin
  new.ends_on := coalesce(new.one_date, (now() at time zone 'Europe/Berlin')::date + 90);
  if tg_op = 'INSERT' then new.featured := false; new.created_at := now(); end if;
  if tg_op = 'UPDATE' then new.featured := old.featured; new.created_by := old.created_by; new.code := old.code; end if;
  return new;
end $$;
drop trigger if exists trains_defaults on public.trains;
create trigger trains_defaults before insert or update on public.trains for each row execute function private.train_defaults();

create or replace function private.my_active_trains() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from public.trains t where t.created_by = auth.uid() and t.ends_on >= (now() at time zone 'Europe/Berlin')::date;
$$;
drop policy if exists trains_insert on public.trains;
create policy trains_insert on public.trains for insert to authenticated
  with check (created_by = auth.uid() and not private.is_suspended(auth.uid()) and private.my_active_trains() < 3);
drop policy if exists trains_update_own on public.trains;
drop policy if exists trains_delete_own on public.trains;
-- nobody reads the table directly (it holds created_by); the app uses train_list() / train_get() / train_cancel()
drop function if exists public.train_cancel(text);
create function public.train_cancel(p_code text) returns void
language sql security definer set search_path = public as $$
  delete from public.trains where code = upper(p_code) and created_by = auth.uid();
$$;

-- ---------- who says "I'll be there" ----------
create table if not exists public.train_members (
  train_code text not null references public.trains(code) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (train_code, user_id)
);
alter table public.train_members enable row level security;
drop policy if exists tm_read_own on public.train_members;
create policy tm_read_own on public.train_members for select to authenticated using (user_id = auth.uid());
drop policy if exists tm_insert_own on public.train_members;
create policy tm_insert_own on public.train_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists tm_delete_own on public.train_members;
create policy tm_delete_own on public.train_members for delete to authenticated using (user_id = auth.uid());

-- the list: numbers only, never who created a train or who is coming
drop function if exists public.train_list();
create function public.train_list()
returns table (code text, label text, line text, from_station text, to_station text, weekdays int[], one_date date, dep_time time,
               minutes int, coach text, theme text, women_only boolean, featured boolean, members bigint, mine boolean, by_me boolean)
language sql stable security definer set search_path = public as $$
  select t.code, t.label, t.line, t.from_station, t.to_station, t.weekdays, t.one_date, t.dep_time, t.minutes, t.coach, t.theme,
         t.women_only, t.featured,
         (select count(*) from public.train_members m where m.train_code = t.code),
         exists (select 1 from public.train_members m where m.train_code = t.code and m.user_id = auth.uid()),
         t.created_by = auth.uid()
  from public.trains t
  where t.ends_on >= (now() at time zone 'Europe/Berlin')::date
  order by t.featured desc, t.dep_time
  limit 60;
$$;
drop function if exists public.train_get(text);
create function public.train_get(p_code text)
returns table (code text, label text, line text, from_station text, to_station text, weekdays int[], one_date date, dep_time time,
               minutes int, coach text, theme text, women_only boolean, featured boolean, members bigint, mine boolean, by_me boolean)
language sql stable security definer set search_path = public as $$
  select * from public.train_list() l where l.code = upper(p_code);
$$;

-- women-only trains: the database refuses a check-in that is not from a woman
create or replace function private.train_checkin_rules() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ride_key ~ '^TRAIN-[A-Z0-9]{6}-' and new.gender <> 'woman'
     and exists (select 1 from public.trains t where t.code = split_part(new.ride_key, '-', 2) and t.women_only) then
    raise exception 'women only';
  end if;
  return new;
end $$;
drop trigger if exists riders_train_rules on public.riders;
create trigger riders_train_rules before insert or update of ride_key, gender on public.riders for each row execute function private.train_checkin_rules();

-- ---------- one group chat per ride ----------
create table if not exists public.group_messages (
  id bigint generated always as identity primary key,
  ride_key text not null check (char_length(ride_key) <= 60),
  from_id uuid not null default auth.uid() references auth.users on delete cascade,
  first_name text,
  body text not null check (char_length(body) between 1 and 500),
  client_id text check (client_id is null or char_length(client_id) <= 40),
  removed boolean not null default false,
  created_at timestamptz not null default now(),
  -- no phone numbers, emails, links or social handles in the group
  check (body !~* '(https?://|www\.|[^[:space:]@]+@[^[:space:]@]+\.[a-z]{2,}|\+?[0-9][0-9 ()/.-]{7,}[0-9]|instagram|snapchat|whatsapp|telegram|t\.me|wa\.me|tiktok)')
);
create unique index if not exists group_messages_client_uniq on public.group_messages (from_id, client_id);
create index if not exists group_messages_ride on public.group_messages (ride_key, created_at);
alter table public.group_messages enable row level security;

-- the sender's first name comes from their check-in (nobody can post under another name); 20 per minute at most
create or replace function private.group_message_rules() returns trigger language plpgsql security definer set search_path = public as $$
begin
  select r.first_name into new.first_name from public.riders r where r.id = new.from_id and r.ride_key = new.ride_key and r.expires_at > now();
  if new.first_name is null then raise exception 'not on this ride'; end if;
  if (select count(*) from public.group_messages g where g.from_id = new.from_id and g.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'too many';
  end if;
  new.removed := false; new.created_at := now();
  return new;
end $$;
drop trigger if exists group_messages_rules on public.group_messages;
create trigger group_messages_rules before insert on public.group_messages for each row execute function private.group_message_rules();

-- may I read this group message? I am checked in on that ride, it is not hidden, and we have not blocked each other
create or replace function private.can_read_group(rk text, sender uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.riders r where r.id = auth.uid() and r.ride_key = rk and r.expires_at > now())
     and not exists (select 1 from public.blocks k where (k.blocker = auth.uid() and k.blocked = sender) or (k.blocker = sender and k.blocked = auth.uid()));
$$;
drop policy if exists gm_read on public.group_messages;
create policy gm_read on public.group_messages for select to authenticated
  using ((not removed or from_id = auth.uid()) and private.can_read_group(ride_key, from_id));
drop policy if exists gm_send on public.group_messages;
create policy gm_send on public.group_messages for insert to authenticated
  with check (from_id = auth.uid() and not private.is_suspended(auth.uid()));

-- the train's creator, or a host on the Talk Train, can hide a message in that ride's group
drop function if exists public.group_remove(bigint);
create function public.group_remove(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare rk text;
begin
  select g.ride_key into rk from public.group_messages g where g.id = p_id;
  if rk is null then return; end if;
  if (rk like 'TALK-%' and private.is_host(auth.uid()))
     or exists (select 1 from public.trains t where rk like 'TRAIN-' || t.code || '-%' and t.created_by = auth.uid()) then
    update public.group_messages set removed = true where id = p_id;
  else
    raise exception 'not allowed';
  end if;
end $$;

-- report: the evidence also keeps the reported person's last group messages on that ride
create or replace function public.file_report(p_reported uuid, p_ride text, p_reason text, p_details text)
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v_id bigint; v_ev jsonb; v_g jsonb;
begin
  if me is null or p_reported is null or p_reported = me then raise exception 'bad report'; end if;
  if p_reason is null or p_reason not in ('under18','harassment','hate','scam','contact','fake','other','comfort') then raise exception 'bad reason'; end if;
  if (select count(*) from reports r where r.reporter = me and r.created_at > now() - interval '1 hour') >= 10 then raise exception 'too many'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('from', case when m.from_id = me then 'reporter' else 'reported' end,
                                               'at', m.created_at, 'body', m.body) order by m.created_at), '[]'::jsonb)
    into v_ev
    from (select * from messages m where ((m.from_id = me and m.to_id = p_reported) or (m.from_id = p_reported and m.to_id = me))
            and left(m.body, 1) <> chr(1) order by m.created_at desc limit 20) m;
  select coalesce(jsonb_agg(jsonb_build_object('from', 'reported (group)', 'at', g.created_at, 'body', g.body) order by g.created_at), '[]'::jsonb)
    into v_g
    from (select * from group_messages g where g.from_id = p_reported and g.ride_key = left(p_ride, 60) order by g.created_at desc limit 20) g;
  insert into reports(reporter, reported, ride_key, reason, reason_code, details, evidence)
    values (me, p_reported, left(p_ride, 60), p_reason, p_reason, left(nullif(trim(p_details), ''), 500), v_ev || v_g)
    returning id into v_id;
  if p_reason <> 'comfort' then insert into notices(user_id, kind, report_id) values (me, 'received', v_id); end if;
  return v_id;
end $$;

-- ---------- permissions ----------
revoke all on public.trains, public.train_members, public.group_messages from anon;
revoke all on public.trains from authenticated;
grant insert (code, label, line, from_station, to_station, weekdays, one_date, dep_time, minutes, coach, theme, women_only) on public.trains to authenticated;
grant select, insert, delete on public.train_members to authenticated;
grant select on public.group_messages to authenticated;
grant insert (ride_key, from_id, body, client_id) on public.group_messages to authenticated;
revoke all on function public.train_list(), public.train_get(text), public.train_cancel(text), public.group_remove(bigint), public.file_report(uuid, text, text, text) from public, anon;
grant execute on function public.train_list(), public.train_get(text), public.train_cancel(text), public.group_remove(bigint), public.file_report(uuid, text, text, text) to authenticated;
revoke all on function private.train_defaults(), private.train_checkin_rules(), private.group_message_rules(), private.can_read_group(text, uuid) from public, anon;
grant execute on function private.can_read_group(text, uuid), private.my_active_trains() to authenticated;

-- live updates for the group (RLS applies to Realtime too)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_messages') then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end $$;

-- ---------- cleanup: group chats go with the ride, trains after their last day ----------
create or replace function private.cleanup() returns void language sql security definer set search_path = public as $$
  delete from public.riders where expires_at < now() - interval '1 hour' and expires_at >= '2026-10-28';
  delete from public.messages where created_at < now() - interval '24 hours' and created_at >= '2026-10-28';
  delete from public.group_messages where created_at < now() - interval '24 hours';
  delete from public.media_items where created_at < now() - interval '24 hours' and not reported and created_at >= '2026-10-28';
  delete from public.media_items where reported and created_at < now() - interval '6 months';
  delete from public.waves where created_at < now() - interval '7 days' and created_at >= '2026-10-28';
  delete from public.trains where ends_on < (now() at time zone 'Europe/Berlin')::date - 1;
  delete from public.reports where created_at < now() - interval '6 months';
  delete from public.notices where created_at < now() - interval '6 months';
  delete from public.suspensions where until < now() - interval '30 days';
$$;
