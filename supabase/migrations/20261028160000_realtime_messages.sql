-- Zugpal: Supabase Realtime for messages (chat, game moves). RLS still applies: each user only receives
-- rows they may select (messages from or to them). Waves stay private: the app sends an empty "poke" on a
-- broadcast channel per ride instead, and everyone re-reads what RLS lets them see. Safe to re-run.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
