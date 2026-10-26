-- Zugpal update: voice for every phone + "who is in the game" + bigger voice limit
alter table public.riders add column if not exists seen_at timestamptz;
alter table public.riders add column if not exists active_game text check (active_game is null or char_length(active_game) <= 20);

alter table public.media_items drop constraint if exists media_items_data_check;
alter table public.media_items add constraint media_items_data_check check (data is null or char_length(data) <= 1500000);

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
    if p_data !~ '^data:audio/(wav|webm|mp4|ogg|aac|mpeg|x-m4a)' then raise exception 'bad audio'; end if;
  else raise exception 'bad kind'; end if;
  if (select count(*) from media_items x where x.from_id = me and x.created_at > now() - interval '1 hour') >= 30 then raise exception 'too many'; end if;
  delete from media_items x where x.created_at < now() - interval '24 hours' and not x.reported;
  insert into media_items(ride_key, from_id, to_id, kind, data) values (p_ride, me, p_to, p_kind, p_data) returning id into v_id;
  insert into messages(ride_key, from_id, to_id, body) values (p_ride, me, p_to, chr(1) || 'media:' || v_id || ':' || p_kind);
  return v_id;
end $$;

drop function if exists public.my_matches();
create function public.my_matches()
returns table (id uuid, first_name text, age_range text, languages text[], moods text[], chat_only boolean, coach text, photo text,
               accept_photos boolean, seen_at timestamptz, active_game text)
language sql stable security definer set search_path = public as $$
  select b.id, b.first_name, b.age_range, b.languages, b.moods, (a.chat_only or b.chat_only),
         case when a.chat_only or b.chat_only then null else b.coach end, b.photo, b.accept_photos, b.seen_at, b.active_game
  from public.riders a join public.riders b on public.can_see(a, b)
  where a.id = auth.uid() and public.is_match(a.id, b.id, a.ride_key);
$$;

revoke all on function public.my_matches() from anon;
grant execute on function public.send_media(uuid, text, text, text), public.my_matches() to authenticated;
