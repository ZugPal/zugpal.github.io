-- Zugpal: automatic deletion so the privacy policy holds even when nobody taps "End my ride". Runs hourly (pg_cron).
-- Data from before 2026-10-28 (old friend tests) is left alone until Husam says to delete it: change KEEP_BEFORE then.
-- Safe to re-run.

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
