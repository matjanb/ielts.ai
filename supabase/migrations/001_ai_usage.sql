-- ============================================================
-- Migration 001: AI Usage Tracking + Additional RLS Policies
-- Run this AFTER the main schema.sql
-- Safe to run multiple times (fully idempotent)
-- ============================================================

-- AI feature usage tracking (for rate limiting)
create table if not exists ai_usage (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  feature    text not null check (feature in ('writing', 'speaking', 'study_plan', 'band_estimate', 'test_explanation')),
  created_at timestamptz not null default now()
);

alter table ai_usage enable row level security;

-- Index for fast monthly usage queries
create index if not exists idx_ai_usage_user_feature_month
  on ai_usage(user_id, feature, created_at desc);

-- ── RLS Policies (idempotent: drop then recreate) ─────────────────────────────

-- ai_usage: users read own, service role inserts
drop policy if exists "Users can view own AI usage" on ai_usage;
create policy "Users can view own AI usage"
  on ai_usage for select
  using (auth.uid() = user_id);

-- profiles: allow insert on signup
drop policy if exists "Service can insert profiles" on profiles;
create policy "Service can insert profiles"
  on profiles for insert
  with check (true);

-- writing_submissions: users can insert their own
drop policy if exists "Users can insert own writing" on writing_submissions;
create policy "Users can insert own writing"
  on writing_submissions for insert
  with check (auth.uid() = user_id);

-- speaking_submissions: users can insert their own
drop policy if exists "Users can insert own speaking" on speaking_submissions;
create policy "Users can insert own speaking"
  on speaking_submissions for insert
  with check (auth.uid() = user_id);

-- band_score_history: users can insert their own
drop policy if exists "Users can insert own band scores" on band_score_history;
create policy "Users can insert own band scores"
  on band_score_history for insert
  with check (auth.uid() = user_id);

-- test_sessions: users can insert their own
drop policy if exists "Users can insert own sessions" on test_sessions;
create policy "Users can insert own sessions"
  on test_sessions for insert
  with check (auth.uid() = user_id);

-- test_results: users can insert their own
drop policy if exists "Users can insert own results" on test_results;
create policy "Users can insert own results"
  on test_results for insert
  with check (auth.uid() = user_id);

-- study_sessions: users can insert their own
drop policy if exists "Users can insert own study sessions" on study_sessions;
create policy "Users can insert own study sessions"
  on study_sessions for insert
  with check (auth.uid() = user_id);
