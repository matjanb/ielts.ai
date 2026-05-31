-- ============================================================
-- Writing test support
-- The shared `questions` table was designed for objective
-- (auto-graded) questions. Writing tasks are essays: they have
-- no single correct answer and use a new question_type 'essay'.
-- ============================================================

-- Allow the 'essay' question type alongside the objective ones.
-- ('matching_headings' already exists in seeded reading data, so it is included
--  here to keep the constraint consistent with the table's real contents.)
alter table questions drop constraint if exists questions_question_type_check;
alter table questions add constraint questions_question_type_check
  check (question_type in ('multiple_choice', 'fill_blank', 'matching', 'true_false', 'matching_headings', 'essay'));

-- Essays have no correct answer.
alter table questions alter column correct_answer drop not null;
