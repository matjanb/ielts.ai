-- 013_lock_content_rls.sql
--
-- Locks down paid test content so it is no longer readable through the public
-- anon key, and removes `correct_answer` from every client-reachable read.
--
-- Two independent layers:
--   1. Row level — tests / test_sections / questions become readable only by
--      AUTHENTICATED users (previously public `using (true)`). A holder of the
--      public anon key with no session can no longer scrape the test bank.
--   2. Column level — `correct_answer` is revoked from the anon and
--      authenticated roles entirely. Server-side grading reads it with the
--      service-role key, which is unaffected, so the answer leak is impossible
--      even for a logged-in subscriber issuing raw REST queries.
--
-- The application already reads these tables only from subscription-gated pages
-- (authenticated) or from the server (service-role), so no client flow breaks.

-- ── 1. Row-level: authenticated-only read ────────────────────────────────────
drop policy if exists "Anyone can read tests"              on tests;
drop policy if exists "Authenticated can read tests"       on tests;
create policy "Authenticated can read tests"
  on tests for select to authenticated using (true);

drop policy if exists "Anyone can read test sections"        on test_sections;
drop policy if exists "Authenticated can read test sections" on test_sections;
create policy "Authenticated can read test sections"
  on test_sections for select to authenticated using (true);

drop policy if exists "Anyone can read questions"        on questions;
drop policy if exists "Authenticated can read questions" on questions;
create policy "Authenticated can read questions"
  on questions for select to authenticated using (true);

-- ── 2. Column-level: never expose correct_answer to client roles ─────────────
-- Revoke broad SELECT, then grant back every column EXCEPT correct_answer.
revoke select on questions from anon, authenticated;
grant select (
  id, section_id, question_number, question_type, question_text,
  image_url, options, points, passage_text, passage_group
) on questions to authenticated;

-- Server-side grading (service-role) keeps full access, including correct_answer.
grant select on questions to service_role;

-- Reload PostgREST's schema cache so the new grants apply immediately.
notify pgrst, 'reload schema';
