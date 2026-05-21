-- ============================================================
-- Seed: IELTS Practice Test 1 — Listening (40 questions)
-- Run AFTER migrations/005_listening_tests.sql
-- ============================================================

-- Insert test
insert into tests (id, title, type, book_number, test_number, difficulty)
values (
  '11111111-0001-0001-0001-000000000001',
  'IELTS Practice Test 1 — Listening',
  'listening',
  1,
  1,
  'medium'
) on conflict (id) do nothing;

-- ── SECTION 1: Lost property report ──────────────────────────────────────────

insert into test_sections (id, test_id, section_number, title, instructions)
values (
  '22222222-0001-0001-0001-000000000001',
  '11111111-0001-0001-0001-000000000001',
  1,
  'Lost Property Report',
  'Questions 1–10. Listen to a conversation at a lost property office and answer the questions.'
) on conflict (id) do nothing;

insert into questions (id, section_id, question_number, question_type, question_text, options, correct_answer, points) values
  (
    '33333333-0001-0001-0001-000000000001',
    '22222222-0001-0001-0001-000000000001',
    1,
    'multiple_choice',
    'Where did the woman lose her bag?',
    '["A. On the bus", "B. In a taxi", "C. At the station", "D. In a shop"]',
    'B. In a taxi',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000002',
    '22222222-0001-0001-0001-000000000001',
    2,
    'multiple_choice',
    'What colour is the bag?',
    '["A. Black", "B. Brown", "C. Blue", "D. Green"]',
    'C. Blue',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000003',
    '22222222-0001-0001-0001-000000000001',
    3,
    'multiple_choice',
    'What size is the bag?',
    '["A. Small", "B. Medium", "C. Large", "D. Extra large"]',
    'B. Medium',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000004',
    '22222222-0001-0001-0001-000000000001',
    4,
    'multiple_choice',
    'What was the most valuable item in the bag?',
    '["A. A laptop", "B. A camera", "C. A wallet", "D. A phone"]',
    'D. A phone',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000005',
    '22222222-0001-0001-0001-000000000001',
    5,
    'multiple_choice',
    'When did the woman lose the bag?',
    '["A. This morning", "B. Yesterday afternoon", "C. Yesterday evening", "D. Last night"]',
    'C. Yesterday evening',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000006',
    '22222222-0001-0001-0001-000000000001',
    6,
    'fill_blank',
    'Write the woman''s name: ___',
    null,
    'Mary Prescott',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000007',
    '22222222-0001-0001-0001-000000000001',
    7,
    'fill_blank',
    'Write the house number: ___',
    null,
    '41',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000008',
    '22222222-0001-0001-0001-000000000001',
    8,
    'fill_blank',
    'Write the street name: ___',
    null,
    'Fountain Road',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000009',
    '22222222-0001-0001-0001-000000000001',
    9,
    'fill_blank',
    'Write the phone number: ___',
    null,
    '752239',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000010',
    '22222222-0001-0001-0001-000000000001',
    10,
    'fill_blank',
    'Write the estimated value of the bag contents: ___',
    null,
    '£65',
    1
  )
on conflict (id) do nothing;

-- ── SECTION 2: News headlines ─────────────────────────────────────────────────

insert into test_sections (id, test_id, section_number, title, instructions)
values (
  '22222222-0001-0001-0001-000000000002',
  '11111111-0001-0001-0001-000000000001',
  2,
  'News Headlines',
  'Questions 11–21. Listen to a radio news programme and answer the questions.'
) on conflict (id) do nothing;

insert into questions (id, section_id, question_number, question_type, question_text, options, correct_answer, points) values
  (
    '33333333-0001-0001-0001-000000000011',
    '22222222-0001-0001-0001-000000000002',
    11,
    'multiple_choice',
    'Which THREE topics are mentioned in the news headlines? (Select the letter that matches)',
    '["E. The economy", "F. A new government policy", "G. A sporting event", "H. The environment", "I. A celebrity interview"]',
    'E. The economy',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000012',
    '22222222-0001-0001-0001-000000000002',
    12,
    'multiple_choice',
    'Second headline topic (tick from the list)',
    '["E. The economy", "F. A new government policy", "G. A sporting event", "H. The environment", "I. A celebrity interview"]',
    'F. A new government policy',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000013',
    '22222222-0001-0001-0001-000000000002',
    13,
    'multiple_choice',
    'Third headline topic (tick from the list)',
    '["E. The economy", "F. A new government policy", "G. A sporting event", "H. The environment", "I. A celebrity interview"]',
    'H. The environment',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000014',
    '22222222-0001-0001-0001-000000000002',
    14,
    'fill_blank',
    'The government has announced a funding package of ___ for infrastructure.',
    null,
    '$250 million',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000015',
    '22222222-0001-0001-0001-000000000002',
    15,
    'fill_blank',
    'Most of the money will be spent on improving the ___.',
    null,
    'road system',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000016',
    '22222222-0001-0001-0001-000000000002',
    16,
    'fill_blank',
    'Critics say the investment comes ___.',
    null,
    'too late',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000017',
    '22222222-0001-0001-0001-000000000002',
    17,
    'fill_blank',
    'The new environmental campaign targets ___.',
    null,
    'school children',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000018',
    '22222222-0001-0001-0001-000000000002',
    18,
    'fill_blank',
    'The campaign will run for ___ months.',
    null,
    '3',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000019',
    '22222222-0001-0001-0001-000000000002',
    19,
    'fill_blank',
    'Children will be encouraged to use ___ instead of cars.',
    null,
    'boats',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000020',
    '22222222-0001-0001-0001-000000000002',
    20,
    'fill_blank',
    'The sports story involves a record-breaking ___.',
    null,
    'pilot',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000021',
    '22222222-0001-0001-0001-000000000002',
    21,
    'fill_blank',
    'The charity auction raised money by selling ___.',
    null,
    'musical instruments',
    1
  )
on conflict (id) do nothing;

-- ── SECTION 3: Economics lecture ──────────────────────────────────────────────

insert into test_sections (id, test_id, section_number, title, instructions)
values (
  '22222222-0001-0001-0001-000000000003',
  '11111111-0001-0001-0001-000000000001',
  3,
  'Economics Lecture',
  'Questions 22–31. Listen to a conversation between two students about their economics course.'
) on conflict (id) do nothing;

insert into questions (id, section_id, question_number, question_type, question_text, options, correct_answer, points) values
  (
    '33333333-0001-0001-0001-000000000022',
    '22222222-0001-0001-0001-000000000003',
    22,
    'multiple_choice',
    'Why is the student worried about the economics course?',
    '["A. It is too expensive", "B. The workload is heavy", "C. The lecturer is difficult to understand", "D. He missed several classes"]',
    'B. The workload is heavy',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000023',
    '22222222-0001-0001-0001-000000000003',
    23,
    'multiple_choice',
    'What does the tutor suggest the student should do first?',
    '["A. Read the textbook", "B. Attend all lectures", "C. Form a study group", "D. Contact the department"]',
    'C. Form a study group',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000024',
    '22222222-0001-0001-0001-000000000003',
    24,
    'multiple_choice',
    'What is the purpose of the weekly seminars?',
    '["A. To replace lectures", "B. To practise essay writing", "C. To discuss reading material", "D. To review exam questions"]',
    'C. To discuss reading material',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000025',
    '22222222-0001-0001-0001-000000000003',
    25,
    'multiple_choice',
    'How is the final grade calculated?',
    '["A. Only the final exam", "B. Coursework only", "C. Exam and coursework equally", "D. Mostly coursework with a small exam component"]',
    'C. Exam and coursework equally',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000026',
    '22222222-0001-0001-0001-000000000003',
    26,
    'fill_blank',
    'The student must ___ on the topic of global trade next week.',
    null,
    'give a talk',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000027',
    '22222222-0001-0001-0001-000000000003',
    27,
    'fill_blank',
    'After the seminar, students should ___.',
    null,
    'write up work',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000028',
    '22222222-0001-0001-0001-000000000003',
    28,
    'fill_blank',
    'For the essay, students ___ the topic themselves.',
    null,
    'can choose',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000029',
    '22222222-0001-0001-0001-000000000003',
    29,
    'fill_blank',
    'The mid-term test is ___.',
    null,
    'open book',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000030',
    '22222222-0001-0001-0001-000000000003',
    30,
    'fill_blank',
    'Most of the required reading is available on ___ in the library.',
    null,
    'closed reserve',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000031',
    '22222222-0001-0001-0001-000000000003',
    31,
    'fill_blank',
    'The course focuses on economics related to ___ subjects.',
    null,
    'vocational subjects',
    1
  )
on conflict (id) do nothing;

-- ── SECTION 4: University lecture ─────────────────────────────────────────────

insert into test_sections (id, test_id, section_number, title, instructions)
values (
  '22222222-0001-0001-0001-000000000004',
  '11111111-0001-0001-0001-000000000001',
  4,
  'University Lecture',
  'Questions 32–40. Listen to a university lecture about business management.'
) on conflict (id) do nothing;

insert into questions (id, section_id, question_number, question_type, question_text, options, correct_answer, points) values
  (
    '33333333-0001-0001-0001-000000000032',
    '22222222-0001-0001-0001-000000000004',
    32,
    'multiple_choice',
    'What is the main topic of today''s lecture?',
    '["A. Marketing strategies", "B. Management styles in business", "C. Financial planning", "D. Human resources"]',
    'B. Management styles in business',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000033',
    '22222222-0001-0001-0001-000000000004',
    33,
    'multiple_choice',
    'Which type of management style does the lecturer focus on first?',
    '["A. Autocratic", "B. Democratic", "C. Laissez-faire", "D. Transactional"]',
    'C. Laissez-faire',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000034',
    '22222222-0001-0001-0001-000000000004',
    34,
    'fill_blank',
    'The lecturer explains the link between ___ and modern business practices.',
    null,
    'history and economics',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000035',
    '22222222-0001-0001-0001-000000000004',
    35,
    'fill_blank',
    'One key skill all managers must develop is ___.',
    null,
    'meeting deadlines',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000036',
    '22222222-0001-0001-0001-000000000004',
    36,
    'fill_blank',
    'Employee performance is often measured by ___ records.',
    null,
    'attendance',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000037',
    '22222222-0001-0001-0001-000000000004',
    37,
    'multiple_choice',
    'Why does the lecturer say some companies fail?',
    '["A. Poor product quality", "B. Weak leadership", "C. Lack of funding", "D. Poor communication"]',
    'B. Weak leadership',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000038',
    '22222222-0001-0001-0001-000000000004',
    38,
    'multiple_choice',
    'What does the lecturer say about team motivation?',
    '["A. It depends only on salary", "B. It requires regular feedback", "C. It is not the manager''s responsibility", "D. It comes naturally over time"]',
    'C. It is not the manager''s responsibility',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000039',
    '22222222-0001-0001-0001-000000000004',
    39,
    'multiple_choice',
    'What will the next lecture cover?',
    '["A. International management", "B. Case studies of failed companies", "C. Leadership theory", "D. Budgeting and finance"]',
    'B. Case studies of failed companies',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000040',
    '22222222-0001-0001-0001-000000000004',
    40,
    'multiple_choice',
    'What does the lecturer recommend students do before the next class?',
    '["A. Read Chapter 4", "B. Write a reflection essay", "C. Watch a documentary", "D. Complete an online quiz"]',
    'D. Complete an online quiz',
    1
  )
on conflict (id) do nothing;
