-- 036_lock_scoring_columns.sql
--
-- Grading became server-only (service role) a while ago, but the legacy
-- table-level grants still let an authenticated client write its own scores:
-- band_score/total_score/completed_at on user_attempts, is_correct on
-- user_answers, and arbitrary rows into band_score_history. Lock them down to
-- exactly what the client still legitimately does:
--   * create a bare attempt at test start          (user_attempts INSERT)
--   * auto-save its own answer text during a test  (user_answers upsert)
-- Everything score-shaped is written by API routes with the service role,
-- which bypasses these grants. RLS row policies stay as they are.

revoke insert, update on public.user_attempts from anon, authenticated;
grant insert (user_id, test_id) on public.user_attempts to authenticated;

-- The client upsert sends (attempt_id, question_id, user_answer); ON CONFLICT
-- DO UPDATE needs UPDATE on the same columns.
revoke insert, update on public.user_answers from anon, authenticated;
grant insert (attempt_id, question_id, user_answer) on public.user_answers to authenticated;
grant update (attempt_id, question_id, user_answer) on public.user_answers to authenticated;

-- Mock overall bands moved to /api/mock/overall (dedup + partial-mock filter);
-- nothing client-side inserts history rows anymore.
revoke insert, update on public.band_score_history from anon, authenticated;
