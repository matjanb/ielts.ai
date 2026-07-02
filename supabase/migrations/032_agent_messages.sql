-- 032_agent_messages.sql
--
-- Memory of everything the coach agent has said (stage 5). Serves three jobs:
-- anti-spam (max 1/day, no repeating yesterday's signal), the in-app feed
-- (notifications panel reads channel='in-app' rows), and learning (Telegram
-- reactions land in user_reaction later).

create table if not exists agent_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  sent_at      timestamptz not null default now(),
  signal_type  text not null check (signal_type in ('inactivity', 'plateau', 'repeated_error', 'positive')),
  channel      text not null check (channel in ('in-app', 'telegram')),
  content      text not null,
  resource_url text,
  user_reaction text
);

create index if not exists idx_agent_messages_user_time
  on agent_messages(user_id, sent_at desc);

alter table agent_messages enable row level security;

-- Users read their own coach messages (the in-app feed); all writes go
-- through the cron with the service role.
drop policy if exists "Users can view own agent messages" on agent_messages;
create policy "Users can view own agent messages"
  on agent_messages for select
  using (auth.uid() = user_id);

-- The evening digest is generated server-side without the user's browser, so
-- the UI language has to live in the profile. Synced (best-effort) whenever
-- the user switches language in the app; null falls back to English.
alter table profiles add column if not exists preferred_language text
  check (preferred_language in ('en', 'ru', 'kz', 'kg', 'uz'));
