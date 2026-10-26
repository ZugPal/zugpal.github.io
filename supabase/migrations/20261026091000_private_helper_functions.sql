-- Zugpal security fix: the helpers can_see / is_match / had_match run with full rights (security definer).
-- In the public schema anyone could call them through the API with any user ids and learn who matched or
-- blocked whom. They now live in a private schema the API does not expose; policies and app functions still use them.
-- Safe to re-run.

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

-- Policies that used the public helpers
drop policy if exists messages_send on public.messages;
create policy messages_send on public.messages for insert to authenticated
  with check (from_id = auth.uid() and private.is_match(auth.uid(), to_id, ride_key));

drop policy if exists compliments_give on public.compliments;
create policy compliments_give on public.compliments for insert to authenticated
  with check (from_id = auth.uid() and private.had_match(auth.uid(), to_id));

drop policy if exists buddies_own on public.buddies;
create policy buddies_own on public.buddies for all to authenticated
  using (from_id = auth.uid()) with check (from_id = auth.uid() and private.had_match(auth.uid(), to_id));

-- App functions that used the public helpers (same results as before)
create or replace function public.visible_riders()
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

create or replace function public.my_matches()
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

-- The old public helpers are no longer used
drop function if exists public.is_match(uuid, uuid, text);
drop function if exists public.had_match(uuid, uuid);
drop function if exists public.can_see(public.riders, public.riders);

-- App functions: only signed-in users (the app always signs in, anonymously). "revoke from anon" alone was not
-- enough because Postgres also grants every function to PUBLIC by default.
revoke all on function public.visible_riders(), public.my_matches(), public.send_media(uuid, text, text, text),
  public.open_media(uuid), public.my_media_status(text), public.report_media(uuid) from public, anon;
grant execute on function public.visible_riders(), public.my_matches(), public.send_media(uuid, text, text, text),
  public.open_media(uuid), public.my_media_status(text), public.report_media(uuid) to authenticated;
