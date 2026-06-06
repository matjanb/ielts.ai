-- 015_processed_webhooks.sql
--
-- Idempotency ledger for Paddle webhooks. Paddle retries an event until it gets
-- a 2xx, so a slow response (or a transient error mid-handler) can deliver the
-- same event several times. We record each event_id the first time we see it and
-- short-circuit any repeat, so a subscription status can't flip-flop on retries.

create table if not exists processed_webhooks (
  event_id     text primary key,
  event_type   text,
  processed_at timestamptz not null default now()
);

-- Only the service-role (which bypasses RLS) ever touches this table.
alter table processed_webhooks enable row level security;
