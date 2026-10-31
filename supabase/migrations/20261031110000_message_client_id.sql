-- 2026-10-31: messages wait in an outbox on the phone when the train has no signal and are sent later.
-- Each message gets a client_id made on the phone; a retry after a lost answer can then never create a duplicate
-- (the app inserts with ON CONFLICT (from_id, client_id) DO NOTHING). Old rows keep client_id null. Safe to re-run.
alter table public.messages add column if not exists client_id text check (client_id is null or char_length(client_id) <= 40);
create unique index if not exists messages_from_client_uniq on public.messages (from_id, client_id);
