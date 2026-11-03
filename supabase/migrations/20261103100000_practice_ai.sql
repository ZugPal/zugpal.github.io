-- Practice ride with AI: the server function practice-chat asks Claude for the replies of the simulated riders.
-- Here only the daily counter that keeps the bill small: how many AI replies each user got today, and in total.
-- No message text is stored. Rows older than a week are removed on every call. Safe to re-run.
create table if not exists private.practice_usage (
  day date not null default current_date,
  uid uuid not null,
  n int not null default 0,
  primary key (day, uid)
);
alter table private.practice_usage enable row level security;
revoke all on private.practice_usage from public, anon, authenticated;

-- counts one AI reply for p_uid; false when the user's or everyone's daily limit is reached
-- only the server function (service role) may call it
create or replace function public.practice_take(p_uid uuid, p_user_max int, p_total_max int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare mine int; total int;
begin
  delete from private.practice_usage where day < current_date - 7;
  select coalesce(sum(n), 0) into total from private.practice_usage where day = current_date;
  if total >= p_total_max then return false; end if;
  insert into private.practice_usage (day, uid, n) values (current_date, p_uid, 1)
    on conflict (day, uid) do update set n = private.practice_usage.n + 1
    returning n into mine;
  return mine <= p_user_max;
end $$;
revoke all on function public.practice_take(uuid, int, int) from public, anon, authenticated;
grant execute on function public.practice_take(uuid, int, int) to service_role;
