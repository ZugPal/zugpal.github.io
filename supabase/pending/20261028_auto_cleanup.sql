-- Zugpal: automatic deletion so the privacy policy ("deleted after 24 hours") is true even when nobody taps "End my ride".
-- WAITING FOR HUSAM'S OK: the first run permanently deletes old test chats and media.
-- Safe to re-run.

create extension if not exists pg_cron;

create or replace function private.cleanup()
returns void language sql security definer set search_path = public as $$
  -- Check-ins: 1 hour after the ride ended
  delete from public.riders where expires_at < now() - interval '1 hour';
  -- Chat messages: after 24 hours (rides last at most 4 hours)
  delete from public.messages where created_at < now() - interval '24 hours';
  -- Photos / voice: after 24 hours unless reported (reported ones stay for review)
  delete from public.media_items where created_at < now() - interval '24 hours' and not reported;
  -- Waves: after 7 days (needed shortly after a ride for badges and ride buddies)
  delete from public.waves where created_at < now() - interval '7 days';
  -- Reports (and the media they kept): at most 6 months
  delete from public.reports where created_at < now() - interval '6 months';
  delete from public.media_items where reported and created_at < now() - interval '6 months';
  delete from public.notices where created_at < now() - interval '6 months';
  delete from public.suspensions where until < now() - interval '30 days';
$$;
revoke all on function private.cleanup() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'zugpal-cleanup';
select cron.schedule('zugpal-cleanup', '17 * * * *', 'select private.cleanup()');
