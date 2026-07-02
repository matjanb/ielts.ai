-- 033_telegram.sql
--
-- Telegram delivery for the coach agent (stage 6). One row per user: a short
-- link_code ties the site account to a chat_id once; the link survives
-- subscription lapses (paused_at marks that the farewell upsell was sent, so
-- resuming a subscription silently resumes delivery — no re-linking).

create table if not exists telegram_links (
  user_id              uuid primary key references profiles(id) on delete cascade,
  telegram_chat_id     bigint unique,
  link_code            text unique,
  link_code_expires_at timestamptz,
  linked_at            timestamptz,
  paused_at            timestamptz,
  created_at           timestamptz not null default now()
);

-- Service-role only (RLS on, no policies): chat ids and link codes never go
-- to the browser directly — the /api/telegram/* routes mediate everything.
alter table telegram_links enable row level security;

-- Maps a delivered Telegram message back to its agent_messages row, so
-- emoji reactions (message_reaction updates) can land in user_reaction.
alter table agent_messages add column if not exists telegram_message_id bigint;
