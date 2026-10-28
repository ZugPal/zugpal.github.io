-- Zugpal: optional "Sprachpraxis" on the profile: 'helper' (happy to speak slow German) or 'learner-<level>' (practising German).
-- visible_riders() returns it so the app can show the tag and suggest good pairs. Safe to re-run.
alter table public.riders add column if not exists practice text;
alter table public.riders drop constraint if exists riders_practice_check;
alter table public.riders add constraint riders_practice_check check (practice is null or practice ~ '^(helper|learner-(A1|A2|B1|B2|C1))$');

drop function if exists public.visible_riders();
create function public.visible_riders()
returns table (id uuid, first_name text, ask_me text, age_range text, languages text[], topics text[], moods text[],
               chat_only boolean, same_coach boolean, waved boolean, photo_small text, badges jsonb, buddy boolean, practice text)
language sql stable security definer set search_path = public as $$
  select b.id, b.first_name, b.ask_me, b.age_range, b.languages, b.topics, b.moods, b.chat_only,
         (a.coach is not null and a.coach = b.coach),
         exists (select 1 from public.waves w where w.from_id = a.id and w.to_id = b.id and w.ride_key = a.ride_key),
         b.photo_small,
         (select coalesce(jsonb_object_agg(x.badge, x.n), '{}'::jsonb)
            from (select c.badge, count(*) as n from public.compliments c where c.to_id = b.id group by c.badge) x),
         (exists (select 1 from public.buddies k where k.from_id = a.id and k.to_id = b.id)
          and exists (select 1 from public.buddies k where k.from_id = b.id and k.to_id = a.id)),
         b.practice
  from public.riders a join public.riders b on private.can_see(a, b)
  where a.id = auth.uid();
$$;
revoke all on function public.visible_riders() from public, anon;
grant execute on function public.visible_riders() to authenticated;
