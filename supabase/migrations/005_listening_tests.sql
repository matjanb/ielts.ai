-- ============================================================
-- IELTS Listening Test System
-- ============================================================

-- ── TESTS ─────────────────────────────────────────────────────────────────────

create table if not exists tests (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  type          text not null check (type in ('listening', 'reading', 'writing', 'speaking')),
  book_number   integer,
  test_number   integer,
  difficulty    text check (difficulty in ('easy', 'medium', 'hard')),
  created_at    timestamptz not null default now()
);

-- ── TEST SECTIONS ─────────────────────────────────────────────────────────────

create table if not exists test_sections (
  id               uuid primary key default uuid_generate_v4(),
  test_id          uuid not null references tests(id) on delete cascade,
  section_number   integer not null check (section_number between 1 and 4),
  title            text not null,
  instructions     text,
  audio_url        text,
  audio_duration   integer, -- seconds
  unique (test_id, section_number)
);

-- ── QUESTIONS ─────────────────────────────────────────────────────────────────

create table if not exists questions (
  id               uuid primary key default uuid_generate_v4(),
  section_id       uuid not null references test_sections(id) on delete cascade,
  question_number  integer not null,
  question_type    text not null check (question_type in ('multiple_choice', 'fill_blank', 'matching', 'true_false')),
  question_text    text not null,
  image_url        text,
  options          jsonb,
  correct_answer   text not null,
  points           integer not null default 1,
  unique (section_id, question_number)
);

-- ── USER ATTEMPTS ─────────────────────────────────────────────────────────────

create table if not exists user_attempts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  test_id         uuid not null references tests(id) on delete cascade,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  total_score     integer,
  band_score      numeric(2,1),
  section_scores  jsonb not null default '{}'
);

-- ── USER ANSWERS ──────────────────────────────────────────────────────────────

create table if not exists user_answers (
  id                   uuid primary key default uuid_generate_v4(),
  attempt_id           uuid not null references user_attempts(id) on delete cascade,
  question_id          uuid not null references questions(id) on delete cascade,
  user_answer          text,
  is_correct           boolean,
  time_spent_seconds   integer,
  unique (attempt_id, question_id)
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────

alter table tests          enable row level security;
alter table test_sections  enable row level security;
alter table questions      enable row level security;
alter table user_attempts  enable row level security;
alter table user_answers   enable row level security;

-- tests: public read
drop policy if exists "Anyone can read tests" on tests;
create policy "Anyone can read tests"
  on tests for select using (true);

-- test_sections: public read
drop policy if exists "Anyone can read test sections" on test_sections;
create policy "Anyone can read test sections"
  on test_sections for select using (true);

-- questions: public read
drop policy if exists "Anyone can read questions" on questions;
create policy "Anyone can read questions"
  on questions for select using (true);

-- user_attempts: users manage own
drop policy if exists "Users can read own attempts" on user_attempts;
drop policy if exists "Users can insert own attempts" on user_attempts;
drop policy if exists "Users can update own attempts" on user_attempts;
create policy "Users can read own attempts"
  on user_attempts for select using (auth.uid() = user_id);
create policy "Users can insert own attempts"
  on user_attempts for insert with check (auth.uid() = user_id);
create policy "Users can update own attempts"
  on user_attempts for update using (auth.uid() = user_id);

-- user_answers: users manage own (via attempt join)
drop policy if exists "Users can read own answers" on user_answers;
drop policy if exists "Users can insert own answers" on user_answers;
drop policy if exists "Users can update own answers" on user_answers;
create policy "Users can read own answers"
  on user_answers for select using (
    exists (
      select 1 from user_attempts ua
      where ua.id = attempt_id and ua.user_id = auth.uid()
    )
  );
create policy "Users can insert own answers"
  on user_answers for insert with check (
    exists (
      select 1 from user_attempts ua
      where ua.id = attempt_id and ua.user_id = auth.uid()
    )
  );
create policy "Users can update own answers"
  on user_answers for update using (
    exists (
      select 1 from user_attempts ua
      where ua.id = attempt_id and ua.user_id = auth.uid()
    )
  );
