-- 2026-10-31: people see who waved at them (Husam's decision) and choose to wave back or not.
-- The person who waved still never learns about a "no": "Not now" is only remembered on the receiver's phone.
-- visible_riders() gets one more column, waved_me. Older app versions simply ignore it. Safe to re-run.
drop function if exists public.visible_riders();
create function public.visible_riders()
returns table (id uuid, first_name text, ask_me text, age_range text, languages text[], topics text[], moods text[],
               chat_only boolean, same_coach boolean, waved boolean, photo_small text, badges jsonb, buddy boolean, practice text,
               waved_me boolean)
language sql stable security definer set search_path = public as $$
  select b.id, b.first_name, b.ask_me, b.age_range, b.languages, b.topics, b.moods, b.chat_only,
         (a.coach is not null and a.coach = b.coach),
         exists (select 1 from public.waves w where w.from_id = a.id and w.to_id = b.id and w.ride_key = a.ride_key),
         b.photo_small,
         (select coalesce(jsonb_object_agg(x.badge, x.n), '{}'::jsonb)
            from (select c.badge, count(*) as n from public.compliments c where c.to_id = b.id group by c.badge) x),
         (exists (select 1 from public.buddies k where k.from_id = a.id and k.to_id = b.id)
          and exists (select 1 from public.buddies k where k.from_id = b.id and k.to_id = a.id)),
         b.practice,
         exists (select 1 from public.waves w where w.from_id = b.id and w.to_id = a.id and w.ride_key = a.ride_key)
  from public.riders a join public.riders b on private.can_see(a, b)
  where a.id = auth.uid();
$$;
revoke all on function public.visible_riders() from public, anon;
grant execute on function public.visible_riders() to authenticated;
