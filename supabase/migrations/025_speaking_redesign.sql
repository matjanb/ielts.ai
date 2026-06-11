-- 025_speaking_redesign.sql
--
-- Foundation for the rebuilt Speaking module: real audio assessment + a
-- dynamic AI examiner. Three independent pieces:
--   1. speaking_submissions gains a `mode` so a full Part 1–3 session is no
--      longer mislabelled as `part = 2`; `part` becomes nullable for full tests.
--   2. A new speaking_turns table records each examiner/candidate exchange with
--      its own transcript, stored audio, and derived fluency metrics.
--   3. A PRIVATE `speaking-audio` storage bucket (signed-URL access only) so
--      candidate recordings can be kept for playback and audio-based grading.

-- ── 1. speaking_submissions: session mode + nullable part ────────────────────
alter table speaking_submissions
  add column if not exists mode text not null default 'part_practice'
    check (mode in ('full_test', 'part_practice'));

-- A full Part 1–3 session spans all parts, so `part` must be allowed to be NULL
-- instead of being forced to 2. Drop the original (auto-named) CHECK, relax the
-- column, and re-add a check that permits NULL.
alter table speaking_submissions drop constraint if exists speaking_submissions_part_check;
alter table speaking_submissions alter column part drop not null;
alter table speaking_submissions
  add constraint speaking_submissions_part_check
  check (part is null or part in (1, 2, 3));

-- ── 2. speaking_turns: per-exchange transcript, audio, fluency metrics ───────
create table if not exists speaking_turns (
  id                uuid primary key default uuid_generate_v4(),
  submission_id     uuid not null references speaking_submissions(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  turn_index        smallint not null,
  part              smallint not null check (part in (1, 2, 3)),
  role              text not null check (role in ('examiner', 'candidate')),
  question_text     text,                 -- examiner prompt this turn answered
  transcript        text,                 -- candidate's transcribed answer
  audio_url         text,                 -- storage path in speaking-audio (candidate turns)
  duration_ms       integer check (duration_ms is null or duration_ms >= 0),
  words             integer check (words is null or words >= 0),
  pause_count       integer check (pause_count is null or pause_count >= 0),
  pause_total_ms    integer check (pause_total_ms is null or pause_total_ms >= 0),
  speech_rate_wpm   numeric(6,1),         -- words per minute of speaking time
  created_at        timestamptz not null default now()
);

alter table speaking_turns enable row level security;

drop policy if exists "Users view own speaking turns"   on speaking_turns;
drop policy if exists "Users insert own speaking turns"  on speaking_turns;
create policy "Users view own speaking turns"
  on speaking_turns for select using (auth.uid() = user_id);
create policy "Users insert own speaking turns"
  on speaking_turns for insert with check (auth.uid() = user_id);

create index if not exists idx_speaking_turns_submission
  on speaking_turns(submission_id, turn_index);

-- ── 3. Private storage bucket for candidate recordings ───────────────────────
-- Unlike the public `test-audio` bucket, speaking recordings are personal data
-- and must never be world-readable: keep the bucket private and serve playback
-- through short-lived signed URLs minted server-side.
insert into storage.buckets (id, name, public)
values ('speaking-audio', 'speaking-audio', false)
on conflict (id) do nothing;

-- Owner-scoped access. Recordings are stored under a `{user_id}/...` prefix, so
-- a user can only ever read/write objects inside their own folder. The
-- service-role key bypasses RLS for server-side uploads and signing.
drop policy if exists "Users read own speaking audio"   on storage.objects;
drop policy if exists "Users insert own speaking audio"  on storage.objects;
create policy "Users read own speaking audio"
  on storage.objects for select to authenticated
  using (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users insert own speaking audio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
