-- ============================================================
-- ielts.ai — Complete Database Schema (idempotent)
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ── ENUMS ─────────────────────────────────────────────────────────────────────
-- Wrapped in DO blocks — idempotent (skipped if type already exists)

do $$ begin
  create type skill_type as enum ('writing', 'speaking', 'reading', 'listening');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('free', 'pro', 'expert', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type test_status as enum ('in_progress', 'completed', 'abandoned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_type as enum ('multiple_choice', 'matching', 'fill_blank', 'true_false_ng', 'essay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type study_goal as enum ('university', 'immigration', 'work', 'personal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type experience_level as enum ('first_time', 'studied_not_taken', 'taken_before');
exception when duplicate_object then null; end $$;

do $$ begin
  create type current_level as enum ('beginner', 'intermediate', 'upper_intermediate', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type timeline as enum ('within_1_month', '1_3_months', '3_6_months', 'not_sure');
exception when duplicate_object then null; end $$;

do $$ begin
  create type study_hours as enum ('30_min', '1_hour', '2_hours', '3_plus_hours');
exception when duplicate_object then null; end $$;

do $$ begin
  create type band_score_source as enum ('mock_test', 'writing_submission', 'speaking_submission', 'manual');
exception when duplicate_object then null; end $$;

-- ── PROFILES ──────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  full_name               text,
  avatar_url              text,
  target_band_score       numeric(2,1) check (target_band_score between 4 and 9),
  current_level           current_level,
  country                 text,
  subscription_status     subscription_status not null default 'free',
  subscription_expires_at timestamptz,
  stripe_customer_id      text unique,
  onboarding_completed    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Auto-create profile on signup (CREATE OR REPLACE is always idempotent)
-- SET search_path = public is required: SECURITY DEFINER runs in auth schema context
-- without it, PostgreSQL can't resolve the unqualified table name "profiles".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop and recreate trigger (only safe idempotent pattern for triggers)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── ONBOARDING DATA ───────────────────────────────────────────────────────────

create table if not exists onboarding_data (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null unique references profiles(id) on delete cascade,
  experience      experience_level,
  target_band     numeric(2,1) check (target_band between 4 and 9),
  current_level   current_level,
  timeline        timeline,
  focus_skills    skill_type[] not null default '{}',
  study_goal      study_goal,
  daily_hours     study_hours,
  created_at      timestamptz not null default now()
);

-- ── STUDY PLANS ───────────────────────────────────────────────────────────────

create table if not exists study_plans (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null unique references profiles(id) on delete cascade,
  weeks_duration  integer not null check (weeks_duration > 0),
  target_band     numeric(2,1) not null,
  focus_skills    skill_type[] not null default '{}',
  daily_minutes   integer not null check (daily_minutes > 0),
  plan_data       jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── MOCK TESTS ────────────────────────────────────────────────────────────────

create table if not exists mock_tests (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  description         text,
  test_type           text not null default 'academic' check (test_type in ('academic', 'general')),
  sections            skill_type[] not null default '{reading,listening,writing,speaking}',
  time_limit_minutes  integer not null default 160,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

-- ── TEST QUESTIONS ────────────────────────────────────────────────────────────

create table if not exists test_questions (
  id              uuid primary key default uuid_generate_v4(),
  test_id         uuid not null references mock_tests(id) on delete cascade,
  section         skill_type not null,
  question_type   question_type not null,
  order_index     integer not null,
  passage_text    text,
  question_text   text not null,
  options         jsonb,
  correct_answer  jsonb,
  explanation     text,
  marks           integer not null default 1,
  created_at      timestamptz not null default now(),
  unique (test_id, order_index)
);

-- ── TEST SESSIONS ─────────────────────────────────────────────────────────────

create table if not exists test_sessions (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references profiles(id) on delete cascade,
  test_id             uuid not null references mock_tests(id),
  status              test_status not null default 'in_progress',
  current_section     skill_type,
  current_question    integer not null default 0,
  time_spent_seconds  integer not null default 0,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz
);

-- ── TEST ANSWERS ──────────────────────────────────────────────────────────────

create table if not exists test_answers (
  id             uuid primary key default uuid_generate_v4(),
  session_id     uuid not null references test_sessions(id) on delete cascade,
  question_id    uuid not null references test_questions(id),
  user_answer    jsonb not null,
  is_correct     boolean,
  marks_awarded  integer not null default 0,
  created_at     timestamptz not null default now(),
  unique (session_id, question_id)
);

-- ── TEST RESULTS ──────────────────────────────────────────────────────────────

create table if not exists test_results (
  id               uuid primary key default uuid_generate_v4(),
  session_id       uuid not null unique references test_sessions(id) on delete cascade,
  user_id          uuid not null references profiles(id) on delete cascade,
  test_id          uuid not null references mock_tests(id),
  overall_band     numeric(2,1) not null,
  writing_band     numeric(2,1),
  speaking_band    numeric(2,1),
  reading_band     numeric(2,1),
  listening_band   numeric(2,1),
  total_marks      integer not null,
  max_marks        integer not null,
  ai_feedback      text,
  created_at       timestamptz not null default now()
);

-- ── WRITING SUBMISSIONS ───────────────────────────────────────────────────────

create table if not exists writing_submissions (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null references profiles(id) on delete cascade,
  task_type              char(1) not null check (task_type in ('1', '2')),
  prompt                 text not null,
  content                text not null,
  word_count             integer not null,
  band_score             numeric(2,1),
  task_achievement       numeric(2,1),
  coherence_cohesion     numeric(2,1),
  lexical_resource       numeric(2,1),
  grammatical_accuracy   numeric(2,1),
  ai_feedback            text,
  created_at             timestamptz not null default now()
);

-- ── SPEAKING SUBMISSIONS ──────────────────────────────────────────────────────

create table if not exists speaking_submissions (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references profiles(id) on delete cascade,
  part                 smallint not null check (part in (1, 2, 3)),
  topic                text not null,
  transcript           text,
  audio_url            text,
  band_score           numeric(2,1),
  fluency_score        numeric(2,1),
  pronunciation_score  numeric(2,1),
  lexical_score        numeric(2,1),
  grammar_score        numeric(2,1),
  ai_feedback          text,
  created_at           timestamptz not null default now()
);

-- ── BAND SCORE HISTORY ────────────────────────────────────────────────────────

create table if not exists band_score_history (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  skill        text not null,  -- skill_type or 'overall'
  score        numeric(2,1) not null check (score between 0 and 9),
  source       band_score_source not null,
  source_id    uuid,
  recorded_at  timestamptz not null default now()
);

-- ── STUDY SESSIONS ────────────────────────────────────────────────────────────

create table if not exists study_sessions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references profiles(id) on delete cascade,
  skill             skill_type not null,
  activity_type     text not null,
  duration_minutes  integer not null check (duration_minutes > 0),
  created_at        timestamptz not null default now()
);

-- ── AI USAGE ──────────────────────────────────────────────────────────────────

create table if not exists ai_usage (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  feature    text not null check (feature in ('writing', 'speaking', 'study_plan', 'band_estimate', 'test_explanation')),
  created_at timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent (safe to re-run)

alter table profiles             enable row level security;
alter table onboarding_data      enable row level security;
alter table study_plans          enable row level security;
alter table test_sessions        enable row level security;
alter table test_answers         enable row level security;
alter table test_results         enable row level security;
alter table writing_submissions  enable row level security;
alter table speaking_submissions enable row level security;
alter table band_score_history   enable row level security;
alter table study_sessions       enable row level security;
alter table mock_tests           enable row level security;
alter table test_questions       enable row level security;
alter table ai_usage             enable row level security;

-- ── RLS POLICIES ──────────────────────────────────────────────────────────────
-- Pattern: DROP POLICY IF EXISTS then CREATE POLICY (only safe idempotent approach)

-- profiles
drop policy if exists "Users can view own profile"   on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Service can insert profiles"  on profiles;
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Service can insert profiles"
  on profiles for insert with check (true);

-- onboarding_data
drop policy if exists "Users manage own onboarding" on onboarding_data;
create policy "Users manage own onboarding"
  on onboarding_data for all using (auth.uid() = user_id);

-- study_plans
drop policy if exists "Users manage own study plans" on study_plans;
create policy "Users manage own study plans"
  on study_plans for all using (auth.uid() = user_id);

-- test_sessions
drop policy if exists "Users manage own sessions"        on test_sessions;
drop policy if exists "Users can insert own sessions"    on test_sessions;
create policy "Users manage own sessions"
  on test_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions"
  on test_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions"
  on test_sessions for update using (auth.uid() = user_id);

-- test_answers
drop policy if exists "Users manage own answers" on test_answers;
drop policy if exists "Users can update own sessions" on test_sessions;
create policy "Users manage own answers"
  on test_answers for all
  using (session_id in (select id from test_sessions where user_id = auth.uid()));

-- test_results
drop policy if exists "Users view own results"       on test_results;
drop policy if exists "Users can insert own results" on test_results;
create policy "Users view own results"
  on test_results for select using (auth.uid() = user_id);
create policy "Users can insert own results"
  on test_results for insert with check (auth.uid() = user_id);

-- writing_submissions
drop policy if exists "Users manage own writing"      on writing_submissions;
drop policy if exists "Users can insert own writing"  on writing_submissions;
create policy "Users manage own writing"
  on writing_submissions for select using (auth.uid() = user_id);
create policy "Users can insert own writing"
  on writing_submissions for insert with check (auth.uid() = user_id);
create policy "Users can update own writing"
  on writing_submissions for update using (auth.uid() = user_id);

-- speaking_submissions
drop policy if exists "Users manage own speaking"     on speaking_submissions;
drop policy if exists "Users can insert own speaking" on speaking_submissions;
create policy "Users manage own speaking"
  on speaking_submissions for select using (auth.uid() = user_id);
create policy "Users can insert own speaking"
  on speaking_submissions for insert with check (auth.uid() = user_id);
create policy "Users can update own speaking"
  on speaking_submissions for update using (auth.uid() = user_id);

-- band_score_history
drop policy if exists "Users view own scores"           on band_score_history;
drop policy if exists "Users can insert own band scores" on band_score_history;
create policy "Users view own scores"
  on band_score_history for select using (auth.uid() = user_id);
create policy "Users can insert own band scores"
  on band_score_history for insert with check (auth.uid() = user_id);

-- study_sessions
drop policy if exists "Users manage own study sessions"        on study_sessions;
drop policy if exists "Users can insert own study sessions"    on study_sessions;
create policy "Users manage own study sessions"
  on study_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own study sessions"
  on study_sessions for insert with check (auth.uid() = user_id);

-- mock_tests and test_questions: all authenticated users can read
drop policy if exists "Authenticated users can read tests"     on mock_tests;
drop policy if exists "Authenticated users can read questions" on test_questions;
create policy "Authenticated users can read tests"
  on mock_tests for select using (auth.uid() is not null);
create policy "Authenticated users can read questions"
  on test_questions for select using (auth.uid() is not null);

-- ai_usage: users read own, service role inserts (no insert policy for authenticated)
drop policy if exists "Users can view own AI usage" on ai_usage;
create policy "Users can view own AI usage"
  on ai_usage for select using (auth.uid() = user_id);

-- ── INDEXES ───────────────────────────────────────────────────────────────────

create index if not exists idx_test_sessions_user          on test_sessions(user_id);
create index if not exists idx_test_sessions_test          on test_sessions(test_id);
create index if not exists idx_test_answers_session        on test_answers(session_id);
create index if not exists idx_test_results_user           on test_results(user_id);
create index if not exists idx_writing_user                on writing_submissions(user_id);
create index if not exists idx_speaking_user               on speaking_submissions(user_id);
create index if not exists idx_band_score_user             on band_score_history(user_id, recorded_at desc);
create index if not exists idx_study_sessions_user         on study_sessions(user_id, created_at desc);
create index if not exists idx_ai_usage_user_feature_month on ai_usage(user_id, feature, created_at desc);
