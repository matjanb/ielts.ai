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

-- ============================================================
-- Writing Test 4 — Cambridge IELTS 1
-- ============================================================

DO $$
DECLARE
  wt4_id  uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS 1 — Writing Test 4', 'writing', 1, 4, 'medium')
RETURNING id INTO wt4_id;

-- ── Task 1 ────────────────────────────────────────────────────

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (
  wt4_id, 1,
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
  'The charts below give information on the location and types of dance classes young people in a town in Australia are currently attending. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{
    "task_type":    "1",
    "min_words":    150,
    "minutes":      20,
    "task_subtype": "chart",
    "note":         "Write at least 150 words."
  }',
  null,
  1
);

-- ── Task 2 ────────────────────────────────────────────────────

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (
  wt4_id, 2,
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
  'In many countries nowadays, consumers can go to a supermarket and buy food produced all over the world. Do you think this is a positive or negative development?',
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
-- Writing Test 5
-- ============================================================

DO $$
DECLARE
  wt5_id  uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS — Writing Test 5', 'writing', 1, 5, 'medium')
RETURNING id INTO wt5_id;

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt5_id, 1, 'Writing Task 1', 'You should spend about 20 minutes on this task. Write at least 150 words.')
RETURNING id INTO s1_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, image_url, points)
VALUES (
  s1_id, 1, 'essay',
  'The graph below gives information about the percentage of the population in four Asian countries living in cities from 1970 to 2020, with predictions for 2030 and 2040. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{"task_type":"1","min_words":150,"minutes":20,"task_subtype":"graph","note":"Write at least 150 words."}',
  null, 1
);

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt5_id, 2, 'Writing Task 2', 'You should spend about 40 minutes on this task. Write at least 250 words.')
RETURNING id INTO s2_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, points)
VALUES (
  s2_id, 1, 'essay',
  'The most important aim of science should be to improve people''s lives. To what extent do you agree or disagree with this statement?',
  '{"task_type":"2","min_words":250,"minutes":40,"note":"Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."}',
  1
);

END $$;

-- ============================================================
-- Writing Test 6
-- ============================================================

DO $$
DECLARE
  wt6_id  uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS — Writing Test 6', 'writing', 1, 6, 'medium')
RETURNING id INTO wt6_id;

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt6_id, 1, 'Writing Task 1', 'You should spend about 20 minutes on this task. Write at least 150 words.')
RETURNING id INTO s1_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, image_url, points)
VALUES (
  s1_id, 1, 'essay',
  'The chart below shows the number of households in the US by their annual income in 2007, 2011 and 2015. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{"task_type":"1","min_words":150,"minutes":20,"task_subtype":"chart","note":"Write at least 150 words."}',
  null, 1
);

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt6_id, 2, 'Writing Task 2', 'You should spend about 40 minutes on this task. Write at least 250 words.')
RETURNING id INTO s2_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, points)
VALUES (
  s2_id, 1, 'essay',
  'Some university students want to learn about other subjects in addition to their main subjects. Others believe it is more important to give all their time and attention to studying for a qualification. Discuss both these views and give your own opinion.',
  '{"task_type":"2","min_words":250,"minutes":40,"note":"Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."}',
  1
);

END $$;

-- ============================================================
-- Writing Test 7
-- ============================================================

DO $$
DECLARE
  wt7_id  uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS — Writing Test 7', 'writing', 1, 7, 'medium')
RETURNING id INTO wt7_id;

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt7_id, 1, 'Writing Task 1', 'You should spend about 20 minutes on this task. Write at least 150 words.')
RETURNING id INTO s1_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, image_url, points)
VALUES (
  s1_id, 1, 'essay',
  'The diagram below shows the floor plan of a public library 20 years ago and how it looks now. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{"task_type":"1","min_words":150,"minutes":20,"task_subtype":"map","note":"Write at least 150 words."}',
  null, 1
);

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt7_id, 2, 'Writing Task 2', 'You should spend about 40 minutes on this task. Write at least 250 words.')
RETURNING id INTO s2_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, points)
VALUES (
  s2_id, 1, 'essay',
  'In many countries around the world, rural people are moving to cities, so the population in the countryside is decreasing. Do you think this is a positive or a negative development?',
  '{"task_type":"2","min_words":250,"minutes":40,"note":"Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."}',
  1
);

END $$;

-- ============================================================
-- Writing Test 8
-- ============================================================

DO $$
DECLARE
  wt8_id  uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS — Writing Test 8', 'writing', 1, 8, 'medium')
RETURNING id INTO wt8_id;

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt8_id, 1, 'Writing Task 1', 'You should spend about 20 minutes on this task. Write at least 150 words.')
RETURNING id INTO s1_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, image_url, points)
VALUES (
  s1_id, 1, 'essay',
  'The graph below shows the average monthly change in the prices of three metals during 2014. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{"task_type":"1","min_words":150,"minutes":20,"task_subtype":"graph","note":"Write at least 150 words."}',
  null, 1
);

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt8_id, 2, 'Writing Task 2', 'You should spend about 40 minutes on this task. Write at least 250 words.')
RETURNING id INTO s2_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, points)
VALUES (
  s2_id, 1, 'essay',
  'In many countries, people are now living longer than ever before. Some people say an ageing population creates problems for governments. Other people think there are benefits if society has more elderly people. To what extent do the advantages of having an ageing population outweigh the disadvantages?',
  '{"task_type":"2","min_words":250,"minutes":40,"note":"Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."}',
  1
);

END $$;

-- ============================================================
-- Writing Test 9
-- ============================================================

DO $$
DECLARE
  wt9_id  uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS — Writing Test 9', 'writing', 1, 9, 'medium')
RETURNING id INTO wt9_id;

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt9_id, 1, 'Writing Task 1', 'You should spend about 20 minutes on this task. Write at least 150 words.')
RETURNING id INTO s1_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, image_url, points)
VALUES (
  s1_id, 1, 'essay',
  'The maps below show an industrial area in the town of Norbiton, and planned future development of the site. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{"task_type":"1","min_words":150,"minutes":20,"task_subtype":"map","note":"Write at least 150 words."}',
  null, 1
);

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt9_id, 2, 'Writing Task 2', 'You should spend about 40 minutes on this task. Write at least 250 words.')
RETURNING id INTO s2_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, points)
VALUES (
  s2_id, 1, 'essay',
  'It is important for people to take risks, both in their professional lives and their personal lives. Do you think the advantages of taking risks outweigh the disadvantages?',
  '{"task_type":"2","min_words":250,"minutes":40,"note":"Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."}',
  1
);

END $$;

-- ============================================================
-- Writing Test 10
-- ============================================================

DO $$
DECLARE
  wt10_id uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS — Writing Test 10', 'writing', 1, 10, 'medium')
RETURNING id INTO wt10_id;

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt10_id, 1, 'Writing Task 1', 'You should spend about 20 minutes on this task. Write at least 150 words.')
RETURNING id INTO s1_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, image_url, points)
VALUES (
  s1_id, 1, 'essay',
  'The table and charts below give information on the police budget for 2017 and 2018 in one area of Britain. The table shows where the money came from and the charts show how it was distributed. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{"task_type":"1","min_words":150,"minutes":20,"task_subtype":"chart","note":"Write at least 150 words."}',
  null, 1
);

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt10_id, 2, 'Writing Task 2', 'You should spend about 40 minutes on this task. Write at least 250 words.')
RETURNING id INTO s2_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, points)
VALUES (
  s2_id, 1, 'essay',
  'Some children spend hours every day on their smartphones. Why is this the case? Do you think this is a positive or a negative development?',
  '{"task_type":"2","min_words":250,"minutes":40,"note":"Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."}',
  1
);

END $$;

-- ============================================================
-- Writing Test 11
-- ============================================================

DO $$
DECLARE
  wt11_id uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS — Writing Test 11', 'writing', 1, 11, 'medium')
RETURNING id INTO wt11_id;

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt11_id, 1, 'Writing Task 1', 'You should spend about 20 minutes on this task. Write at least 150 words.')
RETURNING id INTO s1_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, image_url, points)
VALUES (
  s1_id, 1, 'essay',
  'The chart below shows how families in one country spent their weekly income in 1968 and 2018. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{"task_type":"1","min_words":150,"minutes":20,"task_subtype":"chart","note":"Write at least 150 words."}',
  null, 1
);

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt11_id, 2, 'Writing Task 2', 'You should spend about 40 minutes on this task. Write at least 250 words.')
RETURNING id INTO s2_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, points)
VALUES (
  s2_id, 1, 'essay',
  'Some people believe that professionals, such as doctors and engineers, should be required to work in the country where they did their training. Others believe they should be free to work in another country if they wish. Discuss both these views and give your own opinion.',
  '{"task_type":"2","min_words":250,"minutes":40,"note":"Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."}',
  1
);

END $$;

-- ============================================================
-- Writing Test 12
-- ============================================================

DO $$
DECLARE
  wt12_id uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS — Writing Test 12', 'writing', 1, 12, 'medium')
RETURNING id INTO wt12_id;

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt12_id, 1, 'Writing Task 1', 'You should spend about 20 minutes on this task. Write at least 150 words.')
RETURNING id INTO s1_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, image_url, points)
VALUES (
  s1_id, 1, 'essay',
  'The graph below shows the number of shops that closed and the number of new shops that opened in one country between 2011 and 2018. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{"task_type":"1","min_words":150,"minutes":20,"task_subtype":"graph","note":"Write at least 150 words."}',
  null, 1
);

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt12_id, 2, 'Writing Task 2', 'You should spend about 40 minutes on this task. Write at least 250 words.')
RETURNING id INTO s2_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, points)
VALUES (
  s2_id, 1, 'essay',
  'Nowadays, a growing number of people with health problems are trying alternative medicines and treatments instead of visiting their usual doctor. Do you think this is a positive or a negative development?',
  '{"task_type":"2","min_words":250,"minutes":40,"note":"Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."}',
  1
);

END $$;

-- ============================================================
-- Writing Test 13
-- ============================================================

DO $$
DECLARE
  wt13_id uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS — Writing Test 13', 'writing', 1, 13, 'medium')
RETURNING id INTO wt13_id;

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt13_id, 1, 'Writing Task 1', 'You should spend about 20 minutes on this task. Write at least 150 words.')
RETURNING id INTO s1_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, image_url, points)
VALUES (
  s1_id, 1, 'essay',
  'The charts below show the changes in ownership of electrical appliances and amount of time spent doing housework in households in one country between 1920 and 2019. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{"task_type":"1","min_words":150,"minutes":20,"task_subtype":"chart","note":"Write at least 150 words."}',
  null, 1
);

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt13_id, 2, 'Writing Task 2', 'You should spend about 40 minutes on this task. Write at least 250 words.')
RETURNING id INTO s2_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, points)
VALUES (
  s2_id, 1, 'essay',
  'In some countries, more and more people are becoming interested in finding out about the history of the house or building they live in. What are the reasons for this? How can people research this?',
  '{"task_type":"2","min_words":250,"minutes":40,"note":"Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."}',
  1
);

END $$;

-- ============================================================
-- Writing Test 14
-- ============================================================

DO $$
DECLARE
  wt14_id uuid;
  s1_id   uuid;
  s2_id   uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Cambridge IELTS — Writing Test 14', 'writing', 1, 14, 'medium')
RETURNING id INTO wt14_id;

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt14_id, 1, 'Writing Task 1', 'You should spend about 20 minutes on this task. Write at least 150 words.')
RETURNING id INTO s1_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, image_url, points)
VALUES (
  s1_id, 1, 'essay',
  'The diagram below shows the manufacturing process for making sugar from sugar cane. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '{"task_type":"1","min_words":150,"minutes":20,"task_subtype":"process","note":"Write at least 150 words."}',
  null, 1
);

INSERT INTO test_sections (test_id, section_number, title, instructions)
VALUES (wt14_id, 2, 'Writing Task 2', 'You should spend about 40 minutes on this task. Write at least 250 words.')
RETURNING id INTO s2_id;

INSERT INTO questions (section_id, question_number, question_type, question_text, options, points)
VALUES (
  s2_id, 1, 'essay',
  'In their advertising, businesses nowadays usually emphasise that their products are new in some way. Why is this? Do you think it is a positive or negative development?',
  '{"task_type":"2","min_words":250,"minutes":40,"note":"Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."}',
  1
);

END $$;
