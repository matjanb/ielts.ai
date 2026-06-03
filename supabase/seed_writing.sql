-- ============================================================
-- Writing Mock Tests — Cambridge IELTS 1
-- supabase/seed_writing.sql
-- ============================================================

-- Ensure the 'essay' question type is allowed
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check
  CHECK (question_type IN (
    'multiple_choice', 'fill_blank', 'matching',
    'true_false', 'matching_headings', 'essay'
  ));

ALTER TABLE questions ALTER COLUMN correct_answer DROP NOT NULL;

-- ============================================================
-- Writing Test 2 — Cambridge IELTS 1
-- ============================================================

DO $$
DECLARE
  wt2_id  uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS 1 — Writing Test 2', 'writing', 1, 2, 'medium')
RETURNING id INTO wt2_id;

-- ── Task 1 ────────────────────────────────────────────────────

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (
  wt2_id, 1,
  'Writing Task 1',
  'You should spend about 20 minutes on this task. Write at least 150 words.'
)
RETURNING id INTO s1_id;

INSERT INTO questions (
  section_id, question_number, question_type,
  question_text, options, image_url, points
)
VALUES (
  s1_id, 1, 'essay',
  'The plans below show a harbour in 2000 and how it looks today. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{
    "task_type":  "1",
    "min_words":  150,
    "minutes":    20,
    "task_subtype": "map",
    "note": "Write at least 150 words."
  }',
  null,
  1
);

-- ── Task 2 ────────────────────────────────────────────────────

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (
  wt2_id, 2,
  'Writing Task 2',
  'You should spend about 40 minutes on this task. Write at least 250 words.'
)
RETURNING id INTO s2_id;

INSERT INTO questions (
  section_id, question_number, question_type,
  question_text, options, points
)
VALUES (
  s2_id, 1, 'essay',
  'The working week should be shorter and workers should have a longer weekend. Do you agree or disagree?',
  '{
    "task_type":  "2",
    "min_words":  250,
    "minutes":    40,
    "note": "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
  }',
  1
);

END $$;

-- ============================================================
-- Writing Test 3 — Cambridge IELTS 1
-- ============================================================

DO $$
DECLARE
  wt3_id  uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS 1 — Writing Test 3', 'writing', 1, 3, 'medium')
RETURNING id INTO wt3_id;

-- ── Task 1 ────────────────────────────────────────────────────

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (
  wt3_id, 1,
  'Writing Task 1',
  'You should spend about 20 minutes on this task. Write at least 150 words.'
)
RETURNING id INTO s1_id;

INSERT INTO questions (
  section_id, question_number, question_type,
  question_text, options, image_url, points
)
VALUES (
  s1_id, 1, 'essay',
  'The diagram below shows how a biofuel called ethanol is produced. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{
    "task_type":    "1",
    "min_words":    150,
    "minutes":      20,
    "task_subtype": "process",
    "note":         "Write at least 150 words."
  }',
  null,
  1
);

-- ── Task 2 ────────────────────────────────────────────────────

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (
  wt3_id, 2,
  'Writing Task 2',
  'You should spend about 40 minutes on this task. Write at least 250 words.'
)
RETURNING id INTO s2_id;

INSERT INTO questions (
  section_id, question_number, question_type,
  question_text, options, points
)
VALUES (
  s2_id, 1, 'essay',
  'It is important for everyone, including young people, to save money for their future. To what extent do you agree or disagree with this statement?',
  '{
    "task_type":  "2",
    "min_words":  250,
    "minutes":    40,
    "note": "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
  }',
  1
);

END $$;
