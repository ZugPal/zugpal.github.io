-- 2026-10-31: video messages (view once, max ~20 s) and the private signalling for voice/video calls.
-- Video messages follow the photo rules: only between matches, only after both sent 2+ text messages, only if the
-- other person accepts photos, open once, deleted after 24 h unless reported. Stored like photos/voice (base64, 1.5 MB cap).
-- Calls: the two phones exchange connection details through call_signals (only the two matched people can read them;
-- deleted after 1 hour). Calls unlock like photos (2+ text messages each). The call itself goes phone to phone
-- (or through a TURN relay once one is configured in src/config.js). Safe to re-run.

alter table public.media_items drop constraint if exists media_items_kind_check;
alter table public.media_items add constraint media_items_kind_check check (kind in ('photo', 'voice', 'video'));

-- both have written at least 2 normal text messages on this ride (photos, videos and calls unlock then)
create or replace function private.media_unlocked(a uuid, b uuid, rk text) returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from public.messages m where m.from_id = a and m.to_id = b and m.ride_key = rk and left(m.body, 1) <> chr(1)) >= 2
     and (select count(*) from public.messages m where m.from_id = b and m.to_id = a and m.ride_key = rk and left(m.body, 1) <> chr(1)) >= 2;
$$;

create or replace function public.send_media(p_to uuid, p_ride text, p_kind text, p_data text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; me uuid := auth.uid();
begin
  if me is null or not private.is_match(me, p_to, p_ride) then raise exception 'not a match'; end if;
  if p_kind = 'photo' or p_kind = 'video' then
    if p_kind = 'photo' and p_data !~ '^data:image/jpeg;base64,' then raise exception 'bad photo'; end if;
    if p_kind = 'video' and p_data !~ '^data:video/(mp4|webm)' then raise exception 'bad video'; end if;
    if not coalesce((select r.accept_photos from riders r where r.id = p_to), false) then raise exception 'photos off'; end if;
    if not private.media_unlocked(me, p_to, p_ride) then raise exception 'photos locked'; end if;
  elsif p_kind = 'voice' then
    if p_data !~ '^data:audio/(wav|webm|mp4|ogg|aac|mpeg|x-m4a)' then raise exception 'bad audio'; end if;
  else raise exception 'bad kind'; end if;
  if private.is_suspended(me) then raise exception 'paused'; end if;
  if (select count(*) from media_items x where x.from_id = me and x.created_at > now() - interval '1 hour') >= 30 then raise exception 'too many'; end if;
  delete from media_items x where x.created_at < now() - interval '24 hours' and not x.reported;
  insert into media_items(ride_key, from_id, to_id, kind, data) values (p_ride, me, p_to, p_kind, p_data) returning id into v_id;
  insert into messages(ride_key, from_id, to_id, body) values (p_ride, me, p_to, chr(1) || 'media:' || v_id || ':' || p_kind);
  return v_id;
end $$;
revoke all on function public.send_media(uuid, text, text, text) from public, anon;
grant execute on function public.send_media(uuid, text, text, text) to authenticated;

create table if not exists public.call_signals (
  id bigint generated always as identity primary key,
  ride_key text not null check (char_length(ride_key) <= 60),
  from_id uuid not null default auth.uid() references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  call_id text not null check (char_length(call_id) between 4 and 40),
  kind text not null check (kind in ('offer', 'answer', 'end', 'decline', 'busy')),
  payload text check (payload is null or char_length(payload) <= 30000),
  created_at timestamptz not null default now()
);
create index if not exists call_signals_to on public.call_signals (to_id, created_at);
alter table public.call_signals enable row level security;
drop policy if exists cs_read on public.call_signals;
create policy cs_read on public.call_signals for select to authenticated using (to_id = auth.uid() or from_id = auth.uid());
drop policy if exists cs_send on public.call_signals;
create policy cs_send on public.call_signals for insert to authenticated
  with check (from_id = auth.uid() and not private.is_suspended(auth.uid())
    and private.is_match(auth.uid(), to_id, ride_key) and private.media_unlocked(auth.uid(), to_id, ride_key));
revoke all on public.call_signals from anon;
grant select on public.call_signals to authenticated;
grant insert (ride_key, from_id, to_id, call_id, kind, payload) on public.call_signals to authenticated;
revoke all on function private.media_unlocked(uuid, uuid, text) from public, anon;
grant execute on function private.media_unlocked(uuid, uuid, text) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_signals') then
    alter publication supabase_realtime add table public.call_signals;
  end if;
end $$;

create or replace function private.cleanup() returns void language sql security definer set search_path = public as $$
  delete from public.riders where expires_at < now() - interval '1 hour' and expires_at >= '2026-10-28';
  delete from public.messages where created_at < now() - interval '24 hours' and created_at >= '2026-10-28';
  delete from public.group_messages where created_at < now() - interval '24 hours';
  delete from public.call_signals where created_at < now() - interval '1 hour';
  delete from public.media_items where created_at < now() - interval '24 hours' and not reported and created_at >= '2026-10-28';
  delete from public.media_items where reported and created_at < now() - interval '6 months';
  delete from public.waves where created_at < now() - interval '7 days' and created_at >= '2026-10-28';
  delete from public.trains where ends_on < (now() at time zone 'Europe/Berlin')::date - 1;
  delete from public.reports where created_at < now() - interval '6 months';
  delete from public.notices where created_at < now() - interval '6 months';
  delete from public.suspensions where until < now() - interval '30 days';
$$;
