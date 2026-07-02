-- 030_agent_events.sql
--
-- Behavioral event stream for the AI coach agent (stage 1 of the coach).
-- Deliberately narrow: only events that existing tables cannot answer —
-- abandonment and session rhythm. Accuracy/band data stays in user_attempts /
-- user_answers / *_submissions (single source of truth; do NOT mirror
-- test_completed or question_answered here).

create table if not exists user_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  event_type text not null check (event_type in ('session_start', 'session_end', 'test_abandoned')),
  module     text check (module in ('listening', 'reading', 'writing', 'speaking', 'vocabulary')),
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_events_user_time
  on user_events(user_id, created_at desc);
create index if not exists idx_user_events_user_type
  on user_events(user_id, event_type, created_at desc);

alter table user_events enable row level security;

-- Reads: own rows only. Writes: none from the browser — events go through
-- /api/agent/event, which derives user_id from the session and inserts with
-- the service role, so identity can't be spoofed (same pattern as funnel_events).
drop policy if exists "Users can view own events" on user_events;
create policy "Users can view own events"
  on user_events for select
  using (auth.uid() = user_id);

-- ── ai_usage feature check ───────────────────────────────────────────────────
-- The 014 list predates several features the code now records (reading /
-- listening metering for the free mock, realtime speaking, writing coach,
-- roast) — inserts with those values violate the check and recordUsage()
-- swallows the error silently. Rebuild with the full set actually used today,
-- plus agent_digest for the evening coach.

alter table ai_usage drop constraint if exists ai_usage_feature_check;
alter table ai_usage add constraint ai_usage_feature_check
  check (feature in (
    'writing', 'speaking', 'reading', 'listening',
    'study_plan', 'band_estimate', 'test_explanation', 'transcribe',
    'speaking_realtime', 'writing_coach', 'roast',
    'agent_digest'
  ));
