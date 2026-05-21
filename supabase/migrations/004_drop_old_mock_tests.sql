-- ============================================================
-- Migration 004: Remove old mock-test system
--
-- SAFE TO DROP — audit confirms zero live code queries these tables.
-- The mock-tests UI reads from lib/data/sampleTest.ts (static local data),
-- not from the database. These tables have never been written to in production.
--
-- BACKUP FIRST (run in SQL editor, save output before executing this file):
--   SELECT * FROM test_answers;
--   SELECT * FROM test_results;
--   SELECT * FROM test_sessions;
--   SELECT * FROM test_questions;
--   SELECT * FROM mock_tests;
--
-- Drop order: children → parents (respect foreign-key constraints)
-- ============================================================

-- ── 1. Policies (drop before tables) ─────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can read tests"     ON mock_tests;
DROP POLICY IF EXISTS "Authenticated users can read questions" ON test_questions;
DROP POLICY IF EXISTS "Users manage own sessions"              ON test_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions"          ON test_sessions;
DROP POLICY IF EXISTS "Users can update own sessions"          ON test_sessions;
DROP POLICY IF EXISTS "Users manage own answers"               ON test_answers;
DROP POLICY IF EXISTS "Users view own results"                 ON test_results;
DROP POLICY IF EXISTS "Users can insert own results"           ON test_results;

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_test_sessions_user;
DROP INDEX IF EXISTS idx_test_sessions_test;
DROP INDEX IF EXISTS idx_test_answers_session;
DROP INDEX IF EXISTS idx_test_results_user;

-- ── 3. Tables (child → parent) ───────────────────────────────────────────────

-- test_answers references test_sessions and test_questions
DROP TABLE IF EXISTS test_answers;

-- test_results references test_sessions
DROP TABLE IF EXISTS test_results;

-- test_sessions references mock_tests and profiles
DROP TABLE IF EXISTS test_sessions;

-- test_questions references mock_tests
DROP TABLE IF EXISTS test_questions;

-- mock_tests has no outward FKs
DROP TABLE IF EXISTS mock_tests;

-- ── 4. Enums now orphaned (only used by dropped tables) ───────────────────────

-- test_status was used only by test_sessions
DROP TYPE IF EXISTS test_status;

-- question_type was used only by test_questions
-- NOTE: The TypeScript type `QuestionType` in database.ts is a plain string union
-- and does NOT depend on this DB enum — dropping is safe.
DROP TYPE IF EXISTS question_type;
