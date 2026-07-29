-- 041_telegram_broadcasts.sql
--
-- Admin broadcasts driven from inside Telegram: /broadcast <text> creates a
-- draft, inline buttons pick the audience, the webhook sends it out. One row
-- per broadcast; per-recipient delivery lands in agent_messages with
-- signal_type 'broadcast' (which also lets emoji reactions map back).

create table if not exists telegram_broadcasts (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null references profiles(id) on delete cascade,
  content      text not null,
  audience     text check (audience in ('all', 'free', 'pro')),
  status       text not null default 'draft'
               check (status in ('draft', 'sending', 'sent', 'cancelled')),
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,
  sent_count   int,
  failed_count int
);

-- Service-role only (RLS on, no policies) — same posture as telegram_links.
alter table telegram_broadcasts enable row level security;

alter table agent_messages drop constraint if exists agent_messages_signal_type_check;
alter table agent_messages add constraint agent_messages_signal_type_check
  check (signal_type in ('inactivity', 'plateau', 'repeated_error', 'positive', 'instant_reaction', 'upsell', 'broadcast'));
