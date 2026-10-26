-- Zugpal database setup. Paste everything into Supabase > SQL Editor > New query, then press Run once.

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

alter table public.riders enable row level security;
alter table public.waves enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.messages enable row level security;
alter table public.compliments enable row level security;
alter table public.buddies enable row level security;
alter table public.ride_moods enable row level security;

-- Who may see whom: same train, both open, not expired, women-only respected, nobody blocked
create or replace function public.can_see(a public.riders, b public.riders)
returns boolean language sql stable security definer set search_path = public as $$
  select a.id <> b.id and a.ride_key = b.ride_key and a.is_open and b.is_open
     and a.expires_at > now() and b.expires_at > now()
     and (not a.women_only or b.gender = 'woman') and (not b.women_only or a.gender = 'woman')
     and not exists (select 1 from public.blocks k
                     where (k.blocker = a.id and k.blocked = b.id) or (k.blocker = b.id and k.blocked = a.id));
$$;

create or replace function public.is_match(x uuid, y uuid, rk text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.riders a join public.riders b on b.id = y
    where a.id = x and a.ride_key = rk and public.can_see(a, b)
      and exists (select 1 from public.waves w where w.from_id = x and w.to_id = y and w.ride_key = rk)
      and exists (select 1 from public.waves w where w.from_id = y and w.to_id = x and w.ride_key = rk));
$$;

create or replace function public.had_match(x uuid, y uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.waves a join public.waves b
                 on b.from_id = y and b.to_id = x and b.ride_key = a.ride_key
                 where a.from_id = x and a.to_id = y);
$$;

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
  with check (from_id = auth.uid() and public.is_match(auth.uid(), to_id, ride_key));
create policy messages_delete_own on public.messages for delete to authenticated using (from_id = auth.uid());

drop policy if exists compliments_give on public.compliments;
drop policy if exists compliments_own on public.compliments;
create policy compliments_give on public.compliments for insert to authenticated
  with check (from_id = auth.uid() and public.had_match(auth.uid(), to_id));
create policy compliments_own on public.compliments for select to authenticated using (from_id = auth.uid());

drop policy if exists buddies_own on public.buddies;
create policy buddies_own on public.buddies for all to authenticated
  using (from_id = auth.uid()) with check (from_id = auth.uid() and public.had_match(auth.uid(), to_id));

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
  from public.riders a join public.riders b on public.can_see(a, b)
  where a.id = auth.uid();
$$;

-- My mutual matches (full photo; coach only if neither chose chat only)
drop function if exists public.my_matches();
create function public.my_matches()
returns table (id uuid, first_name text, age_range text, languages text[], moods text[], chat_only boolean, coach text, photo text)
language sql stable security definer set search_path = public as $$
  select b.id, b.first_name, b.age_range, b.languages, b.moods, (a.chat_only or b.chat_only),
         case when a.chat_only or b.chat_only then null else b.coach end, b.photo
  from public.riders a join public.riders b on public.can_see(a, b)
  where a.id = auth.uid() and public.is_match(a.id, b.id, a.ride_key);
$$;

revoke all on function public.visible_riders() from anon;
revoke all on function public.my_matches() from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.riders, public.waves, public.blocks, public.messages,
  public.compliments, public.buddies to authenticated;
grant insert on public.reports, public.ride_moods to authenticated;
grant execute on function public.visible_riders(), public.my_matches(), public.can_see(public.riders, public.riders),
  public.is_match(uuid, uuid, text), public.had_match(uuid, uuid) to authenticated;

-- Zugpal: view-once photos and play-once voice messages. Run once in SQL Editor.
alter table public.riders add column if not exists accept_photos boolean not null default true;

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  ride_key text not null,
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('photo','voice')),
  data text check (data is null or char_length(data) <= 600000),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  reported boolean not null default false);
alter table public.media_items enable row level security;
-- No direct access to media_items: only through the functions below.

create or replace function public.send_media(p_to uuid, p_ride text, p_kind text, p_data text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; me uuid := auth.uid();
begin
  if me is null or not public.is_match(me, p_to, p_ride) then raise exception 'not a match'; end if;
  if p_kind = 'photo' then
    if p_data !~ '^data:image/jpeg;base64,' then raise exception 'bad photo'; end if;
    if not coalesce((select r.accept_photos from riders r where r.id = p_to), false) then raise exception 'photos off'; end if;
    if (select count(*) from messages m where m.from_id = me and m.to_id = p_to and m.ride_key = p_ride and left(m.body,1) <> chr(1)) < 2
    or (select count(*) from messages m where m.from_id = p_to and m.to_id = me and m.ride_key = p_ride and left(m.body,1) <> chr(1)) < 2
    then raise exception 'photos locked'; end if;
  elsif p_kind = 'voice' then
    if p_data !~ '^data:audio/(webm|mp4|ogg|aac|mpeg)' then raise exception 'bad audio'; end if;
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

drop function if exists public.my_matches();
create function public.my_matches()
returns table (id uuid, first_name text, age_range text, languages text[], moods text[], chat_only boolean, coach text, photo text, accept_photos boolean)
language sql stable security definer set search_path = public as $$
  select b.id, b.first_name, b.age_range, b.languages, b.moods, (a.chat_only or b.chat_only),
         case when a.chat_only or b.chat_only then null else b.coach end, b.photo, b.accept_photos
  from public.riders a join public.riders b on public.can_see(a, b)
  where a.id = auth.uid() and public.is_match(a.id, b.id, a.ride_key);
$$;

revoke all on function public.send_media(uuid, text, text, text), public.open_media(uuid),
  public.my_media_status(text), public.report_media(uuid), public.my_matches() from anon;
grant execute on function public.send_media(uuid, text, text, text), public.open_media(uuid),
  public.my_media_status(text), public.report_media(uuid), public.my_matches() to authenticated;
