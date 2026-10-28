-- Zugpal: notice-and-action for reports (DSA basics).
-- Reporter gets a confirmation and later the decision; the reported person gets the action and the reason;
-- moderators decide with private.decide_report(...) (run in the SQL editor or by Claude via the connector).
-- Only adds things; safe to re-run.

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
