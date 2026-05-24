-- ============================================================
-- Seed: Cambridge IELTS 1 Practice Test 1 — Listening
-- REAL questions extracted from the official book
-- ============================================================
 
insert into tests (id, title, type, book_number, test_number, difficulty)
values (
  '11111111-0001-0001-0001-000000000001',
  'Listening Test 1',
  'listening', 1, 1, 'medium'
) on conflict (id) do nothing;
 
-- ── SECTION 1 ────────────────────────────────────────────────
insert into test_sections (id, test_id, section_number, title, instructions, audio_url)
values (
  '22222222-0001-0001-0001-000000000001',
  '11111111-0001-0001-0001-000000000001',
  1,
  'Lost Property Office',
  'Questions 1–10. Circle the appropriate letter (1–5), then complete the form (6–10).',
  'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-1.mp3'
) on conflict (id) do nothing;
 
insert into questions (id, section_id, question_number, question_type, question_text, options, correct_answer, image_url, points)
values
  (
    '33333333-0001-0001-0001-000000000001',
    '22222222-0001-0001-0001-000000000001', 1,
    'multiple_choice',
    'What does her briefcase look like?',
    '["A. Soft leather with buckles at front", "B. Hard box-type with combination lock", "C. Soft leather with zip closure", "D. Hard case with handle on top"]',
    'A. Soft leather with buckles at front',
    'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/q1_briefcases.jpeg',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000002',
    '22222222-0001-0001-0001-000000000001', 2,
    'multiple_choice',
    'Which picture shows the distinguishing features?',
    '["A. Brand name on back, scratch above", "B. Brand name on front, no scratch", "C. Brand name on back, scratch below", "D. Brand name on side, scratch on front"]',
    'C. Brand name on back, scratch below',
    'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/q2_sagi.png',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000003',
    '22222222-0001-0001-0001-000000000001', 3,
    'multiple_choice',
    'What did she have inside her briefcase?',
    '["A. wallet, pens and novel", "B. papers and wallet", "C. pens and novel", "D. papers, pens and novel"]',
    'D. papers, pens and novel',
    null,
    1
  ),
  (
    '33333333-0001-0001-0001-000000000004',
    '22222222-0001-0001-0001-000000000001', 4,
    'multiple_choice',
    'Where was she standing when she lost her briefcase?',
    '["A. On the platform, holding it", "B. On the platform, bag on floor beside her", "C. At the ticket office", "D. On a bench in the waiting room"]',
    'D. On a bench in the waiting room',
    'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/q3_woman_train.png',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000005',
    '22222222-0001-0001-0001-000000000001', 5,
    'multiple_choice',
    'What time was it when she lost her briefcase?',
    '["A. About 5:20", "B. About 5:25", "C. About 5:30", "D. About 5:35"]',
    'C. About 5:30',
    'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/q4_clocks.png',
    1
  ),
  (
    '33333333-0001-0001-0001-000000000006',
    '22222222-0001-0001-0001-000000000001', 6,
    'fill_blank',
    'Complete the Personal Details Form. Name: Mary ___',
    null, 'Prescott', 1
  ),
  (
    '33333333-0001-0001-0001-000000000007',
    '22222222-0001-0001-0001-000000000001', 7,
    'fill_blank',
    'Address: Flat 2, number ___, ___ Road, Canterbury',
    null, '41', 1
  ),
  (
    '33333333-0001-0001-0001-000000000008',
    '22222222-0001-0001-0001-000000000001', 8,
    'fill_blank',
    'Street name: ___ Road',
    null, 'Fountain', 1
  ),
  (
    '33333333-0001-0001-0001-000000000009',
    '22222222-0001-0001-0001-000000000001', 9,
    'fill_blank',
    'Telephone: ___',
    null, '752239', 1
  ),
  (
    '33333333-0001-0001-0001-000000000010',
    '22222222-0001-0001-0001-000000000001', 10,
    'fill_blank',
    'Estimated value of lost item: £___',
    null, '65', 1
  )
on conflict (id) do nothing;
 
-- ── SECTION 2 ────────────────────────────────────────────────
insert into test_sections (id, test_id, section_number, title, instructions, audio_url)
values (
  '22222222-0001-0001-0001-000000000002',
  '11111111-0001-0001-0001-000000000001',
  2,
  'Radio News Programme',
  'Questions 11–21. Tick the THREE other items mentioned in the news headlines (11–13), then complete the notes (14–21).',
  'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-1.mp3'
) on conflict (id) do nothing;
 
insert into questions (id, section_id, question_number, question_type, question_text, options, correct_answer, points)
values
  (
    '33333333-0001-0001-0001-000000000011',
    '22222222-0001-0001-0001-000000000002', 11,
    'multiple_choice',
    'Tick the THREE other items mentioned in the news headlines. (Q11 — first item)',
    '["A. Rivers flood in the north", "C. Nurses on strike in Melbourne", "D. Passengers rescued from ship", "E. Passengers rescued from plane", "F. Bus and train drivers national strike threat", "G. Teachers demand more pay", "H. New uniform for QANTAS staff", "I. National airports under new management"]',
    'E. Passengers rescued from plane', 1
  ),
  (
    '33333333-0001-0001-0001-000000000012',
    '22222222-0001-0001-0001-000000000002', 12,
    'multiple_choice',
    'Tick the THREE other items mentioned in the news headlines. (Q12 — second item)',
    '["A. Rivers flood in the north", "C. Nurses on strike in Melbourne", "D. Passengers rescued from ship", "E. Passengers rescued from plane", "F. Bus and train drivers national strike threat", "G. Teachers demand more pay", "H. New uniform for QANTAS staff", "I. National airports under new management"]',
    'F. Bus and train drivers national strike threat', 1
  ),
  (
    '33333333-0001-0001-0001-000000000013',
    '22222222-0001-0001-0001-000000000002', 13,
    'multiple_choice',
    'Tick the THREE other items mentioned in the news headlines. (Q13 — third item)',
    '["A. Rivers flood in the north", "C. Nurses on strike in Melbourne", "D. Passengers rescued from ship", "E. Passengers rescued from plane", "F. Bus and train drivers national strike threat", "G. Teachers demand more pay", "H. New uniform for QANTAS staff", "I. National airports under new management"]',
    'H. New uniform for QANTAS staff', 1
  ),
  (
    '33333333-0001-0001-0001-000000000014',
    '22222222-0001-0001-0001-000000000002', 14,
    'fill_blank',
    'The Government plans to give $___ to assist the farmers.',
    null, '250 million', 1
  ),
  (
    '33333333-0001-0001-0001-000000000015',
    '22222222-0001-0001-0001-000000000002', 15,
    'fill_blank',
    'This money was to be spent on improving Sydney''s ___.',
    null, 'road system', 1
  ),
  (
    '33333333-0001-0001-0001-000000000016',
    '22222222-0001-0001-0001-000000000002', 16,
    'fill_blank',
    'Farmers say that the money will not help them because it is ___.',
    null, 'too late', 1
  ),
  (
    '33333333-0001-0001-0001-000000000017',
    '22222222-0001-0001-0001-000000000002', 17,
    'fill_blank',
    'An aeroplane which was carrying a group of ___ was forced to land.',
    null, 'school children', 1
  ),
  (
    '33333333-0001-0001-0001-000000000018',
    '22222222-0001-0001-0001-000000000002', 18,
    'fill_blank',
    'The aeroplane was forced to land just ___ minutes after take-off.',
    null, '3', 1
  ),
  (
    '33333333-0001-0001-0001-000000000019',
    '22222222-0001-0001-0001-000000000002', 19,
    'fill_blank',
    'The passengers were rescued by ___.',
    null, 'boats', 1
  ),
  (
    '33333333-0001-0001-0001-000000000020',
    '22222222-0001-0001-0001-000000000002', 20,
    'fill_blank',
    'The passengers thanked the ___ for saving their lives.',
    null, 'pilot', 1
  ),
  (
    '33333333-0001-0001-0001-000000000021',
    '22222222-0001-0001-0001-000000000002', 21,
    'fill_blank',
    'Unfortunately they lost their ___.',
    null, 'musical instruments', 1
  )
on conflict (id) do nothing;
 
-- ── SECTION 3 ────────────────────────────────────────────────
insert into test_sections (id, test_id, section_number, title, instructions, audio_url)
values (
  '22222222-0001-0001-0001-000000000003',
  '11111111-0001-0001-0001-000000000001',
  3,
  'Economics Course Discussion',
  'Questions 22–31. Circle the appropriate letter (22–25), then complete the notes (26–31).',
  'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-1.mp3'
) on conflict (id) do nothing;
 
insert into questions (id, section_id, question_number, question_type, question_text, options, correct_answer, points)
values
  (
    '33333333-0001-0001-0001-000000000022',
    '22222222-0001-0001-0001-000000000003', 22,
    'multiple_choice',
    'The orientation meeting',
    '["A. took place recently.", "B. took place last term.", "C. will take place tomorrow.", "D. will take place next week."]',
    'A. took place recently.', 1
  ),
  (
    '33333333-0001-0001-0001-000000000023',
    '22222222-0001-0001-0001-000000000003', 23,
    'multiple_choice',
    'Attendance at lectures is',
    '["A. optional after 4 pm.", "B. closely monitored.", "C. difficult to enforce.", "D. sometimes unnecessary."]',
    'B. closely monitored.', 1
  ),
  (
    '33333333-0001-0001-0001-000000000024',
    '22222222-0001-0001-0001-000000000003', 24,
    'multiple_choice',
    'Tutorials take place',
    '["A. every morning.", "B. twice a week.", "C. three mornings a week.", "D. three afternoons a week."]',
    'C. three mornings a week.', 1
  ),
  (
    '33333333-0001-0001-0001-000000000025',
    '22222222-0001-0001-0001-000000000003', 25,
    'multiple_choice',
    'The lecturer''s name is',
    '["A. Roberts.", "B. Rawson.", "C. Rogers.", "D. Robertson."]',
    'A. Roberts.', 1
  ),
  (
    '33333333-0001-0001-0001-000000000026',
    '22222222-0001-0001-0001-000000000003', 26,
    'fill_blank',
    'Course requirements — Tutorial paper: Students must ___ for 25 minutes.',
    null, 'talk', 1
  ),
  (
    '33333333-0001-0001-0001-000000000027',
    '22222222-0001-0001-0001-000000000003', 27,
    'fill_blank',
    'After giving the talk, students must ___.',
    null, 'write up work', 1
  ),
  (
    '33333333-0001-0001-0001-000000000028',
    '22222222-0001-0001-0001-000000000003', 28,
    'fill_blank',
    'Essay topic: Usually students ___.',
    null, 'can choose', 1
  ),
  (
    '33333333-0001-0001-0001-000000000029',
    '22222222-0001-0001-0001-000000000003', 29,
    'fill_blank',
    'Type of exam: ___',
    null, 'open book', 1
  ),
  (
    '33333333-0001-0001-0001-000000000030',
    '22222222-0001-0001-0001-000000000003', 30,
    'fill_blank',
    'Library: Important books are in ___.',
    null, 'closed reserve', 1
  ),
  (
    '33333333-0001-0001-0001-000000000031',
    '22222222-0001-0001-0001-000000000003', 31,
    'fill_blank',
    'Focus of course: Focus on ___ subjects.',
    null, 'vocational subjects', 1
  )
on conflict (id) do nothing;
 
-- ── SECTION 4 ────────────────────────────────────────────────
insert into test_sections (id, test_id, section_number, title, instructions, audio_url)
values (
  '22222222-0001-0001-0001-000000000004',
  '11111111-0001-0001-0001-000000000001',
  4,
  'University Lecture',
  'Questions 32–41. Circle the appropriate letter.',
  'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-1.mp3'
) on conflict (id) do nothing;
 
insert into questions (id, section_id, question_number, question_type, question_text, options, correct_answer, points)
values
  (
    '33333333-0001-0001-0001-000000000032',
    '22222222-0001-0001-0001-000000000004', 32,
    'multiple_choice',
    'The speaker works within the Faculty of',
    '["A. Science and Technology.", "B. Arts and Social Sciences.", "C. Architecture.", "D. Law."]',
    'B. Arts and Social Sciences.', 1
  ),
  (
    '33333333-0001-0001-0001-000000000033',
    '22222222-0001-0001-0001-000000000004', 33,
    'multiple_choice',
    'The Faculty consists firstly of',
    '["A. subjects.", "B. degrees.", "C. divisions.", "D. departments."]',
    'C. divisions.', 1
  ),
  (
    '33333333-0001-0001-0001-000000000034',
    '22222222-0001-0001-0001-000000000004', 34,
    'fill_blank',
    'The subjects taken in the first semester are psychology, sociology, ___ and ___.',
    null, 'history and economics', 1
  ),
  (
    '33333333-0001-0001-0001-000000000035',
    '22222222-0001-0001-0001-000000000004', 35,
    'fill_blank',
    'Students may have problems with ___ (for essays).',
    null, 'meeting deadlines', 1
  ),
  (
    '33333333-0001-0001-0001-000000000036',
    '22222222-0001-0001-0001-000000000004', 36,
    'fill_blank',
    'Students may also have problems with ___.',
    null, 'attendance', 1
  ),
  (
    '33333333-0001-0001-0001-000000000037',
    '22222222-0001-0001-0001-000000000004', 37,
    'multiple_choice',
    'The speaker says students can visit her',
    '["A. every morning.", "B. some mornings.", "C. mornings only.", "D. Friday morning."]',
    'B. some mornings.', 1
  ),
  (
    '33333333-0001-0001-0001-000000000038',
    '22222222-0001-0001-0001-000000000004', 38,
    'multiple_choice',
    'According to the speaker, a tutorial',
    '["A. is a type of lecture.", "B. is less important than a lecture.", "C. provides a chance to share views.", "D. provides an alternative to groupwork."]',
    'C. provides a chance to share views.', 1
  ),
  (
    '33333333-0001-0001-0001-000000000039',
    '22222222-0001-0001-0001-000000000004', 39,
    'multiple_choice',
    'When writing essays, the speaker advises the students to',
    '["A. research their work well.", "B. name the books they have read.", "C. share work with their friends.", "D. avoid using other writers'' ideas."]',
    'B. name the books they have read.', 1
  ),
  (
    '33333333-0001-0001-0001-000000000040',
    '22222222-0001-0001-0001-000000000004', 40,
    'multiple_choice',
    'The speaker thinks that plagiarism is',
    '["A. a common problem.", "B. an acceptable risk.", "C. a minor concern.", "D. a serious offence."]',
    'D. a serious offence.', 1
  ),
  (
    '33333333-0001-0001-0001-000000000041',
    '22222222-0001-0001-0001-000000000004', 41,
    'multiple_choice',
    'The speaker''s aims are to',
    '["A. introduce students to university expectations.", "B. introduce students to the members of staff.", "C. warn students about the difficulties of studying.", "D. guide students round the university."]',
    'A. introduce students to university expectations.', 1
  )
on conflict (id) do nothing;

-- ── PASSAGE TEXT — Section 2 (Q14–21) ───────────────────────
-- passage_group=1: Government money / farmers story
UPDATE questions SET passage_text = 'The Government plans to give {{Q}} $ to assist the farmers. This money was to be spent on improving Sydney''s', passage_group = 1 WHERE id = '33333333-0001-0001-0001-000000000014';
UPDATE questions SET passage_text = '{{Q}} but has now been re-allocated. Australia has experienced its worst drought in over fifty years. Farmers say that the money will not help them because it is', passage_group = 1 WHERE id = '33333333-0001-0001-0001-000000000015';
UPDATE questions SET passage_text = '{{Q}} .', passage_group = 1 WHERE id = '33333333-0001-0001-0001-000000000016';

-- passage_group=2: Aeroplane story
UPDATE questions SET passage_text = 'An aeroplane which was carrying a group of {{Q}}', passage_group = 2 WHERE id = '33333333-0001-0001-0001-000000000017';
UPDATE questions SET passage_text = 'was forced to land just {{Q}} minutes after take-off.', passage_group = 2 WHERE id = '33333333-0001-0001-0001-000000000018';
UPDATE questions SET passage_text = 'The passengers were rescued by {{Q}} . The operation was helped because of the good weather. The passengers thanked the', passage_group = 2 WHERE id = '33333333-0001-0001-0001-000000000019';
UPDATE questions SET passage_text = '{{Q}} for saving their lives but unfortunately they lost their', passage_group = 2 WHERE id = '33333333-0001-0001-0001-000000000020';
UPDATE questions SET passage_text = '{{Q}} .', passage_group = 2 WHERE id = '33333333-0001-0001-0001-000000000021';

-- ── PASSAGE TEXT — Section 3 (Q26–31) ───────────────────────
-- passage_group=3: Tutorial paper (two bullet points)
UPDATE questions SET passage_text = '• A piece of work on a given topic. Students must: • {{Q}} for 25 minutes', passage_group = 3 WHERE id = '33333333-0001-0001-0001-000000000026';
UPDATE questions SET passage_text = '• {{Q}} • give to lecturer for marking', passage_group = 3 WHERE id = '33333333-0001-0001-0001-000000000027';

-- passage_group=4: Essay topic
UPDATE questions SET passage_text = 'Usually {{Q}}', passage_group = 4 WHERE id = '33333333-0001-0001-0001-000000000028';

-- passage_group=5: Type of exam
UPDATE questions SET passage_text = '{{Q}}', passage_group = 5 WHERE id = '33333333-0001-0001-0001-000000000029';

-- passage_group=6: Library
UPDATE questions SET passage_text = 'Important books are in {{Q}} .', passage_group = 6 WHERE id = '33333333-0001-0001-0001-000000000030';

-- passage_group=7: Focus of course
UPDATE questions SET passage_text = 'Focus on {{Q}} subjects.', passage_group = 7 WHERE id = '33333333-0001-0001-0001-000000000031';

-- ── PASSAGE TEXT — Section 4 (Q34–36) ───────────────────────
-- passage_group=8: First semester subjects / problems
UPDATE questions SET passage_text = 'The subjects taken in the first semester in this course are psychology, sociology, {{Q}} and', passage_group = 8 WHERE id = '33333333-0001-0001-0001-000000000034';
UPDATE questions SET passage_text = '. Students may have problems with {{Q}} and', passage_group = 8 WHERE id = '33333333-0001-0001-0001-000000000035';
UPDATE questions SET passage_text = '{{Q}} .', passage_group = 8 WHERE id = '33333333-0001-0001-0001-000000000036';

-- ============================================================
-- PRACTICE TEST 2 — LISTENING
-- ============================================================

DO $$
DECLARE
  t2_id uuid;
  s1_id uuid;
  s2_id uuid;
  s3_id uuid;
  s4_id uuid;
BEGIN

-- Test
INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Listening Test 2', 'listening', 1, 2, 'medium')
RETURNING id INTO t2_id;

-- Sections
INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t2_id, 1, 'Section 1 — Questions 1-10',
'Complete the notes. Use NO MORE THAN THREE WORDS for each answer.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-2.mp3')
RETURNING id INTO s1_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t2_id, 2, 'Section 2 — Questions 11-20',
'Complete the notes below. Use NO MORE THAN THREE WORDS for each answer.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-2.mp3')
RETURNING id INTO s2_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t2_id, 3, 'Section 3 — Questions 21-32',
'Questions 21-24: Circle the correct answer. Questions 25-30: Complete the notes using NO MORE THAN THREE WORDS. Questions 31-32: Circle the TWO correct boxes.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-2.mp3')
RETURNING id INTO s3_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t2_id, 4, 'Section 4 — Questions 33-41',
'Questions 33-35: Circle the correct answer. Questions 36-39: Complete the notes using NO MORE THAN THREE WORDS. Questions 40-41: Complete the diagram.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-2.mp3')
RETURNING id INTO s4_id;

-- ============================================================
-- SECTION 1 — Q1-10 (two-column form table: KATE and LUKI)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 1, 'fill_blank', 'KATE — Type of accommodation', 'student accommodation/hostel',
'{"form":true,"person":"KATE","label":"Type of accommodation"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 2, 'fill_blank', 'KATE — Her feelings about the accommodation', 'awful food',
'{"form":true,"person":"KATE","label":"Her feelings about the accommodation"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 3, 'fill_blank', 'KATE — Her feelings about the other students', 'not friendly',
'{"form":true,"person":"KATE","label":"Her feelings about the other students"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 4, 'fill_blank', 'KATE — Difficulties experienced on the course', 'lecturers (too) busy',
'{"form":true,"person":"KATE","label":"Difficulties experienced on the course"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 5, 'fill_blank', 'KATE — Suggestions for improving the course', 'regular meetings',
'{"form":true,"person":"KATE","label":"Suggestions for improving the course"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 6, 'fill_blank', 'LUKI — First type of accommodation', 'family/homestay',
'{"form":true,"person":"LUKI","label":"First type of accommodation"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 7, 'fill_blank', 'LUKI — Problem with the first accommodation', 'lot of noise',
'{"form":true,"person":"LUKI","label":"Problem with the first accommodation"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 8, 'fill_blank', 'LUKI — Second type of accommodation', 'student house',
'{"form":true,"person":"LUKI","label":"Second type of accommodation"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 9, 'fill_blank', 'LUKI — Name of course', '(Bachelor of) Computing',
'{"form":true,"person":"LUKI","label":"Name of course"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 10, 'fill_blank', 'LUKI — Suggestions for improving the course', 'reserve computer time',
'{"form":true,"person":"LUKI","label":"Suggestions for improving the course"}', 1);

-- ============================================================
-- SECTION 2 — Q11-20 (bordered notes box with bicycle image)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s2_id, 11, 'fill_blank',
'There are many kinds of bicycles available: racing, touring, (11) ___, ordinary',
'mountain',
'{"box":true,"box_title":"Bicycles","image_position":"right"}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt2 bike q11-20.png');

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 12, 'fill_blank', 'They vary in price and (12) ___.', 'quality', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 13, 'fill_blank', 'Prices range from $50.00 to (13) ___.', '$2,000', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 14, 'fill_blank', 'Single speed cycles are suitable for (14) ___.', 'short/casual rides', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 15, 'fill_blank', 'Three speed cycles are suitable for (15) ___.', 'town riding/shopping', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 16, 'fill_blank', 'Five and ten speed cycles are suitable for longer distances, hills and (16) ___.', 'serious touring', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 17, 'fill_blank', 'Ten speed bikes are better because they are (17) ___ in price but (18) ___.', 'similar/almost the same', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 18, 'fill_blank', 'Ten speed bikes are better — (18) ___.', 'better quality (components)', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 19, 'fill_blank', 'Buying a cycle is like (19) ___.', 'buying clothes', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 20, 'fill_blank', 'The size of the bicycle is determined by the size of the (20) ___.', 'frame', '{"box":true}', 1);

-- ============================================================
-- SECTION 3 — Q21-24 (multiple choice)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 21, 'multiple_choice',
'At first Fiona thinks that Martin''s tutorial topic is',
'B',
'{"A":"inappropriate.","B":"dull.","C":"interesting.","D":"fascinating."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 22, 'multiple_choice',
'According to Martin, the banana',
'C',
'{"A":"has only recently been cultivated.","B":"is economical to grow.","C":"is good for your health.","D":"is his favourite food."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 23, 'multiple_choice',
'Fiona listens to Martin because she',
'D',
'{"A":"wants to know more about bananas.","B":"has nothing else to do today.","C":"is interested in the economy of Australia.","D":"wants to help Martin."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 24, 'multiple_choice',
'According to Martin, bananas were introduced into Australia from',
'B',
'{"A":"India.","B":"England.","C":"China.","D":"Africa."}', 1);

-- ============================================================
-- SECTION 3 — Q25-30 (bordered notes box with banana tree image)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s3_id, 25, 'fill_blank',
'Each banana tree produces (25) ___ of bananas.',
'one bunch',
'{"box":true,"box_title":"Commercially grown banana plant","image_position":"right"}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt2 bananatree q25-30.png');

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 26, 'fill_blank',
'On modern plantations in tropical conditions a tree can bear fruit after (26) ___.',
'15 months', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 27, 'fill_blank',
'Banana trees prefer to grow (27) ___ and they require rich soil and (28) ___.',
'uphill/on hillsides', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 28, 'fill_blank',
'Banana trees — rich soil and (28) ___.',
'lots of/plenty of water', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 29, 'fill_blank',
'The fruit is often protected by (29) ___.',
'plastic bags', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 30, 'fill_blank',
'Ripe bananas emit a gas which helps other (30) ___.',
'bananas/ones (to) ripen', '{"box":true}', 1);

-- ============================================================
-- SECTION 3 — Q31-32 (multi-select, pick TWO, with Australia map image)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s3_id, 31, 'multiple_choice',
'Consumption of Australian bananas — Circle the TWO correct boxes.',
'C',
'{"A":"Europe","B":"Asia","C":"New Zealand","D":"Australia","E":"Other","multi":true,"select_count":2,"linked_pair":32}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt2 australia q31-32.png');

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 32, 'multiple_choice',
'Consumption of Australian bananas — second answer',
'D',
'{"multi":true,"select_count":2,"linked_pair":31,"hidden_label":true}', 1);

-- ============================================================
-- SECTION 4 — Q33-35 (multiple choice)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 33, 'multiple_choice',
'According to the first speaker, the focus of the lecture series is on',
'B',
'{"A":"organising work and study.","B":"maintaining a healthy lifestyle.","C":"coping with homesickness.","D":"settling in at university."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 34, 'multiple_choice',
'The lecture will be given by',
'D',
'{"A":"the president of the Union.","B":"the campus doctor.","C":"a sports celebrity.","D":"a health expert."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 35, 'multiple_choice',
'According to the second speaker, this week''s lecture is on',
'C',
'{"A":"campus food.","B":"dieting.","C":"sensible eating.","D":"saving money."}', 1);

-- ============================================================
-- SECTION 4 — Q36-39 (bordered notes box "A balanced diet")
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 36, 'fill_blank',
'Vitamins in food can be lost through (36) ___.',
'cooking',
'{"box":true,"box_title":"A balanced diet"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 37, 'fill_blank',
'Water soluble vitamins — not stored, so you need a (37) ___.',
'(regular) daily intake', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 38, 'fill_blank',
'Eat (38) ___ of foods.',
'(a) variety', '{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 39, 'fill_blank',
'Buy plenty of vegetables and store them in (39) ___.',
'the dark/the fridge/a cool place', '{"box":true}', 1);

-- ============================================================
-- SECTION 4 — Q40-41 (food pyramid diagram)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s4_id, 40, 'fill_blank',
'Food pyramid — middle level (milk, lean meat, fish, nuts, eggs): (40) ___',
'eat in moderation/not too much',
'{"box":true,"diagram":true,"diagram_position":"left","box_title":"Food pyramid"}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt2 triangle q40-41.jpg');

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 41, 'fill_blank',
'Food pyramid — bottom level (bread, vegetables and fruit): (41) ___',
'eat lots/eat most',
'{"box":true,"diagram":true,"diagram_position":"right"}', 1);

END $$;

-- ============================================================
-- LISTENING TEST 3
-- ============================================================

DO $$
DECLARE
  t3_id uuid;
  s1_id uuid;
  s2_id uuid;
  s3_id uuid;
  s4_id uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Listening Test 3', 'listening', 1, 3, 'medium')
RETURNING id INTO t3_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t3_id, 1, 'Section 1 — Questions 1-12',
'Questions 1-4: Circle the appropriate letter. Questions 5-10: Complete the application form using NO MORE THAN THREE WORDS. Questions 11-12: Answer the questions.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-3.mp3')
RETURNING id INTO s1_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t3_id, 2, 'Section 2 — Questions 13-23',
'Complete the notes below using NO MORE THAN THREE WORDS for each answer.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-3.mp3')
RETURNING id INTO s2_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t3_id, 3, 'Section 3 — Questions 24-32',
'Questions 24-27: Circle the correct answer. Questions 28-32: Complete the notes using NO MORE THAN THREE WORDS for each answer.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-3.mp3')
RETURNING id INTO s3_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t3_id, 4, 'Section 4 — Questions 33-42',
'Questions 33-37: Complete the table using NO MORE THAN THREE WORDS. Questions 38-42: Label the diagram using NO MORE THAN THREE WORDS for each answer.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-3.mp3')
RETURNING id INTO s4_id;

-- ============================================================
-- SECTION 1 — Q1-4 (multiple choice)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 1, 'multiple_choice',
'What are the parking regulations on campus?',
'B',
'{"A":"undergraduate parking allowed","B":"postgraduate parking allowed","C":"staff parking only allowed","D":"no student parking allowed"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 2, 'multiple_choice',
'The administration office is in',
'D',
'{"A":"Block B.","B":"Block D.","C":"Block E.","D":"Block G."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 3, 'multiple_choice',
'If you do not have a parking sticker, the following action will be taken:',
'C',
'{"A":"wheel clamp your car.","B":"fine only.","C":"tow away your car and fine.","D":"tow away your car only."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s1_id, 4, 'multiple_choice',
'Which picture shows the correct location of the Administration office?',
'A',
'{"A":"A","B":"B","C":"C","D":"D","image_options":true}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt3-q4.png');

-- ============================================================
-- SECTION 1 — Q5-10 (application form fill_blank)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 5, 'fill_blank', 'Name', 'Richard Lee',
'{"form":true,"label":"Name","form_title":"Application for parking sticker"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 6, 'fill_blank', 'Address', '30 Enmore Road',
'{"form":true,"label":"Address","prefill":"Flat 13"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 7, 'fill_blank', 'Suburb', 'Newport',
'{"form":true,"label":"Suburb"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 8, 'fill_blank', 'Faculty', 'Architecture',
'{"form":true,"label":"Faculty"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 9, 'fill_blank', 'Registration number', 'LJX 058K',
'{"form":true,"label":"Registration number"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 10, 'fill_blank', 'Make of car', 'Ford',
'{"form":true,"label":"Make of car"}', 1);

-- ============================================================
-- SECTION 1 — Q11-12
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 11, 'multiple_choice',
'Cashier''s office opens at',
'C',
'{"A":"12.15","B":"2.00","C":"2.15","D":"4.30"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 12, 'fill_blank',
'Where must the sticker be displayed?',
'(on the) (front) window/windscreen',
'{}', 1);

-- ============================================================
-- SECTION 2 — Q13-23 (museum notes two-column form)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 13, 'fill_blank', 'Date the museum was opened', 'November 1991',
'{"form":true,"label":"Date the museum was opened","form_title":"Museum Notes"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 14, 'fill_blank', 'The museum consists of a building and', '(historic) ships',
'{"form":true,"label":"The museum consists of a building and"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 15, 'fill_blank', 'The Education Centre is signposted by', 'green arrows',
'{"form":true,"label":"The Education Centre is signposted by"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 16, 'fill_blank', 'If you lose your friends, meet at the', 'information desk',
'{"form":true,"label":"If you lose your friends, meet at the"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 17, 'fill_blank', 'Warning about The Vampire', 'stairs to climb/lots of stairs',
'{"form":true,"label":"Warning about The Vampire"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 18, 'fill_blank', 'How often are the tours of The Vampire?', 'every hour',
'{"form":true,"label":"How often are the tours of The Vampire?"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 19, 'fill_blank', 'Person featured in today''s video', 'Captain Cook',
'{"form":true,"label":"Person featured in today''s video"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 20, 'fill_blank', 'The Leisure Gallery shows how Australian culture is influenced by', 'the sea',
'{"form":true,"label":"The Leisure Gallery shows how Australian culture is influenced by"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 21, 'fill_blank', 'The Picture Gallery contains pictures by', 'Australian artists/painters',
'{"form":true,"label":"The Picture Gallery contains pictures by"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 22, 'fill_blank', 'Cost of family membership of the museum', '$70',
'{"form":true,"label":"Cost of family membership of the museum"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 23, 'fill_blank', '"Passengers and the Sea" includes a collection of', 'souvenirs',
'{"form":true,"label":"\"Passengers and the Sea\" includes a collection of"}', 1);

-- ============================================================
-- SECTION 3 — Q24-27 (multiple choice)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 24, 'multiple_choice',
'Mark is going to talk briefly about',
'B',
'{"A":"marketing new products.","B":"pricing strategies.","C":"managing large companies.","D":"setting sales targets."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 25, 'multiple_choice',
'According to Susan, air fares are lowest when they',
'C',
'{"A":"include weekend travel.","B":"are booked well in advance.","C":"are non-refundable.","D":"are for business travel only."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 26, 'multiple_choice',
'Mark thinks revenue management is',
'D',
'{"A":"interesting.","B":"complicated.","C":"time-consuming.","D":"reasonable."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 27, 'multiple_choice',
'The airline companies want to',
'A',
'{"A":"increase profits.","B":"benefit the passenger.","C":"sell cheap seats.","D":"improve the service."}', 1);

-- ============================================================
-- SECTION 3 — Q28-32 (bordered notes box)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 28, 'fill_blank',
'Two reasons for the new approach to pricing — first reason: (28) ___',
'law has changed/law changes',
'{"box":true,"box_title":"New approach to pricing"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 29, 'fill_blank',
'Two reasons for the new approach to pricing — second reason: (29) ___',
'(powerful) computer programs',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 30, 'fill_blank',
'In future people will be able to book airline tickets (30) ___.',
'from home (computer)',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 31, 'fill_blank',
'Also being marketed in this way are (31) ___ and (32) ___.',
'hotels/hotel beds/rooms',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 32, 'fill_blank',
'Also being marketed in this way — (32) ___.',
'hire cars',
'{"box":true}', 1);

-- ============================================================
-- SECTION 4 — Q33-37 (SPACE MANAGEMENT table)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 33, 'fill_blank',
'Questionnaires — what customers think about (33) ___',
'displays/products/displays and products',
'{"table":true,"table_title":"SPACE MANAGEMENT","col_left":"RESEARCH METHOD","col_right":"INFORMATION PROVIDED","row_left":"Questionnaires","row_right_prefix":"what customers think about"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 34, 'fill_blank',
'(34) ___ — how customers move around supermarket aisles',
'(hidden) TV cameras',
'{"table":true,"row_right":"how customers move around supermarket aisles"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 35, 'fill_blank',
'Eye movement (35) ___ — the most eye-catching areas of the shop',
'recorder/recording',
'{"table":true,"row_left_prefix":"Eye movement","row_right":"the most eye-catching areas of the shop"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 36, 'fill_blank',
'Computer programs e.g. (36) ___',
'"Spaceman"',
'{"table":true,"row_left_prefix":"Computer programs e.g."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 37, 'fill_blank',
'Computer programs — the best (37) ___ for an article in the shop',
'position/shelf/spot/place',
'{"table":true,"row_right_prefix":"the best","row_right_suffix":"for an article in the shop"}', 1);

-- ============================================================
-- SECTION 4 — Q38-42 (SUPERMARKET AISLE diagram table)
-- ============================================================

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 38, 'fill_blank',
'ENTRANCE — First shelves: customers usually (38) ___ these.',
'walk (straight/right) past/ignore/pass',
'{"diagram_table":true,"diagram_title":"A SUPERMARKET AISLE","zone":"ENTRANCE","zone_position":"left"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 39, 'fill_blank',
'AISLE — Products placed here sell well particularly if they are placed (39) ___',
'at eye level/near customers'' eyes',
'{"diagram_table":true,"zone":"AISLE","zone_position":"center"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 40, 'fill_blank',
'AISLE — These areas are known as (40) ___',
'hotspots',
'{"diagram_table":true,"zone":"AISLE","zone_position":"center"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 41, 'fill_blank',
'EXIT — Gondola end: often find (41) ___ displayed here.',
'special offers',
'{"diagram_table":true,"zone":"EXIT","zone_position":"right"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 42, 'fill_blank',
'EXIT — Checkout: often used to sell (42) ___',
'chocolates',
'{"diagram_table":true,"zone":"EXIT","zone_position":"right"}', 1);

END $$;

-- ============================================================
-- LISTENING TEST 4
-- ============================================================

DO $$
DECLARE
  t4_id uuid;
  s1_id uuid;
  s2_id uuid;
  s3_id uuid;
  s4_id uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Listening Test 4', 'listening', 1, 4, 'medium')
RETURNING id INTO t4_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t4_id, 1, 'Section 1 — Questions 1-12',
'Questions 1-5: Circle the appropriate letter. Questions 6-10: Complete the registration form using NO MORE THAN THREE WORDS. Questions 11-12: Circle the appropriate letter.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-4.mp3')
RETURNING id INTO s1_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t4_id, 2, 'Section 2 — Questions 13-21',
'Complete the notes. Write NO MORE THAN THREE WORDS for each answer.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-4.mp3')
RETURNING id INTO s2_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t4_id, 3, 'Section 3 — Questions 22-31',
'Questions 22-25: Complete the factsheet using NO MORE THAN THREE WORDS. Questions 26-31: Label the aluminium can diagram using NO MORE THAN THREE WORDS.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-4.mp3')
RETURNING id INTO s3_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t4_id, 4, 'Section 4 — Questions 32-42',
'Complete the lecture notes. Use NO MORE THAN THREE WORDS for each answer.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-4.mp3')
RETURNING id INTO s4_id;

-- SECTION 1 — Q1-5 (multiple choice with images)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s1_id, 1, 'multiple_choice',
'Where is the administration building?',
'C',
'{"A":"A","B":"B","C":"C","D":"D","image_options":true}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt4 q1.png');

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 2, 'multiple_choice',
'How many people are waiting in the queue?',
'A',
'{"A":"50","B":"100","C":"200","D":"300"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s1_id, 3, 'multiple_choice',
'What does the woman order for lunch?',
'B',
'{"A":"A","B":"B","C":"C","D":"D","image_options":true}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt4 q3.png');

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s1_id, 4, 'multiple_choice',
'What does the woman order to drink?',
'D',
'{"A":"A","B":"B","C":"C","D":"D","image_options":true}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt4 q4.png');

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 5, 'multiple_choice',
'How much money does the woman give the man?',
'D',
'{"A":"$2.00","B":"$3.00","C":"$3.50","D":"$5.00"}', 1);

-- SECTION 1 — Q6-10 (registration form)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 6, 'fill_blank', 'Name of student', 'Julia Perkins',
'{"form":true,"label":"Name of student","form_title":"Registration Form"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 7, 'fill_blank', 'Address', '15 Waratah Road',
'{"form":true,"label":"Address","prefill":"Flat 5/"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 8, 'fill_blank', 'Town', 'Brisbane',
'{"form":true,"label":"Town"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 9, 'fill_blank', 'Tel', 'to be advised',
'{"form":true,"label":"Tel"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 10, 'fill_blank', 'Course', 'first year Law',
'{"form":true,"label":"Course"}', 1);

-- SECTION 1 — Q11-12

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s1_id, 11, 'multiple_choice',
'What did the man buy for her to eat?',
'C',
'{"A":"A","B":"B","C":"C","D":"D","image_options":true}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt4 q11.png');

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 12, 'multiple_choice',
'What must the students do as part of registration at the university?',
'D',
'{"A":"Check the notice board in the Law Faculty.","B":"Find out about lectures.","C":"Organise tutorial groups.","D":"Pay the union fees."}', 1);

-- SECTION 2 — Q13-21 (STUDENT BANKING)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 13, 'fill_blank',
'Midland bank location: (13) ___',
'Hope Street',
'{"table":true,"table_title":"STUDENT BANKING","col_left":"Recommended Banks","col_right":"Location","row_left":"Midland","row_right_prefix":""}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 14, 'fill_blank',
'Funding — Must provide (14) ___ I can support myself.',
'evidence',
'{"box":true,"box_title":"STUDENT BANKING — Notes"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 15, 'fill_blank',
'Opening an account — Take with me: (15) ___ and letter of enrolment.',
'passport',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 16, 'fill_blank',
'Recommended account: (16) ___',
'current/student (account)',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 17, 'fill_blank',
'Bank supplies: (17) ___ and chequecard which guarantees cheques.',
'chequebook',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 18, 'fill_blank',
'Cashcard: you can (18) ___ cash at any time.',
'withdraw/draw (out)/take out',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 19, 'fill_blank',
'Switch/Delta cards: take the money (19) ___ the account.',
'directly from/right out of',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 20, 'fill_blank',
'Overdraft — Must have (20) ___',
'permission of/from bank',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 21, 'fill_blank',
'Opening times — Most banks open until (21) ___ during the week.',
'4.30 pm or/to 5 pm',
'{"box":true}', 1);

-- SECTION 3 — Q22-25 (FACTSHEET - Aluminium Cans)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 22, 'fill_blank',
'(22) ___ produced every day in the US — more cans produced than nails or (23) ___',
'300 million',
'{"box":true,"box_title":"FACTSHEET - Aluminium Cans"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 23, 'fill_blank',
'More cans produced than nails or (23) ___',
'paper clips',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 24, 'fill_blank',
'Each can weighs 0.48 ounces — thinner than two (24) ___',
'magazine pages/pieces of paper/pages',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 25, 'fill_blank',
'Can take more than 90 pounds of pressure per square inch — over (25) ___ the pressure of a car tyre',
'three times',
'{"box":true}', 1);

-- SECTION 3 — Q26-31 (aluminium can diagram)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s3_id, 26, 'fill_blank',
'Body — (26) ___ at base (reflective surface of aluminium can easily be decorated)',
'thicker',
'{"diagram_labels":true,"diagram_title":"Aluminium Can","hint":"reflective surface, easily decorated"}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt4 q26-31.jpg');

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 27, 'fill_blank',
'(27) ___ — reflective surface of aluminium can easily be decorated',
'label',
'{"diagram_labels":true,"hint":"reflective surface label"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 28, 'fill_blank',
'Base — shaped like (28) ___ to withstand pressure',
'(a) dome',
'{"diagram_labels":true,"hint":"base shape"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 29, 'fill_blank',
'(29) ___ (shown in close-up detail)',
'flange',
'{"diagram_labels":true,"hint":"close-up detail part"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 30, 'fill_blank',
'Lid — makes up (30) ___ of total weight',
'25%',
'{"diagram_labels":true,"hint":"percentage of total weight"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 31, 'fill_blank',
'(31) ___ (opening mechanism)',
'scored opening',
'{"diagram_labels":true,"hint":"opening mechanism"}', 1);

-- SECTION 4 — Q32-42 (lecture notes)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 32, 'fill_blank',
'Purpose of the mini lecture — To experience: (32) ___',
'a university lecture',
'{"box":true,"box_title":"Purpose of the mini lecture"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 33, 'fill_blank',
'Purpose of the mini lecture — To find out about: (33) ___',
'Sports Studies (programme)',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 34, 'fill_blank',
'The three strands of Sports Studies — b. Sports (34) ___',
'management',
'{"box":true,"box_title":"The three strands of Sports Studies are:"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 35, 'fill_blank',
'a. The psychologists work with (35) ___',
'top athletes',
'{"box":true,"box_title":"a — Sports psychology"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 36, 'fill_blank',
'They want to discover what (36) ___',
'makes winners/makes them/people win',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 37, 'fill_blank',
'b. Sports marketing looks at (37) ___',
'market forces',
'{"box":true,"box_title":"b — Sports marketing"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 38, 'fill_blank',
'Sport now competes with (38) ___',
'(other) leisure activities',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 39, 'fill_blank',
'Spectators want (39) ___',
'entertainment/to be entertained',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 40, 'fill_blank',
'c. Sports physiology is also known as (40) ___',
'exercise science',
'{"box":true,"box_title":"c — Sports physiology"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 41, 'fill_blank',
'Macro levels look at (41) ___',
'fitness testing/body measurements',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 42, 'fill_blank',
'Micro level looks at (42) ___',
'cellular research/cellular change/body cells',
'{"box":true}', 1);

END $$;

-- ============================================================
-- LISTENING TEST 5 (Cambridge IELTS Academic format)
-- ============================================================

DO $$
DECLARE
  t5_id uuid;
  s1_id uuid;
  s2_id uuid;
  s3_id uuid;
  s4_id uuid;
BEGIN

INSERT INTO tests (title, type, book_number, test_number, difficulty)
VALUES ('Listening Test 5', 'listening', 2, 1, 'medium')
RETURNING id INTO t5_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t5_id, 1, 'Part 1 — Questions 1-10',
'Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-5-section1.mp3')
RETURNING id INTO s1_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t5_id, 2, 'Part 2 — Questions 11-20',
'Questions 11-15: Choose the correct letter, A, B or C. Questions 16-20: Label the map. Write the correct letter, A-H, next to Questions 16-20.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-5-section2.mp3')
RETURNING id INTO s2_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t5_id, 3, 'Part 3 — Questions 21-30',
'Questions 21-22: Choose TWO letters, A-E. Questions 23-24: Choose TWO letters, A-E. Questions 25-30: Choose SIX answers from the box and write the correct letter, A-H, next to Questions 25-30.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-5-section3.mp3')
RETURNING id INTO s3_id;

INSERT INTO test_sections (test_id, section_number, title, instructions, audio_url)
VALUES (t5_id, 4, 'Part 4 — Questions 31-40',
'Complete the notes below. Write ONE WORD ONLY for each answer.',
'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/test-audio/test-5-section4.mp3')
RETURNING id INTO s4_id;

-- PART 1 — Q1-10 (Hinchingbrooke Country Park notes box)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 1, 'fill_blank',
'Area: (1) ___ hectares',
'69',
'{"box":true,"box_title":"Hinchingbrooke Country Park","box_subtitle":"The park"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 2, 'fill_blank',
'Wetland: lakes, ponds and a (2) ___',
'stream',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 3, 'fill_blank',
'Science: Children look at (3) ___ about plants, etc.',
'data',
'{"box":true,"box_subtitle":"Subjects studied in educational visits include"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 4, 'fill_blank',
'Geography: includes learning to use a (4) ___ and compass',
'map',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 5, 'fill_blank',
'Leisure and tourism: mostly concentrates on the park''s (5) ___',
'visitors',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 6, 'fill_blank',
'Music: Children make (6) ___ with natural materials, and experiment with rhythm and speed.',
'sounds',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 7, 'fill_blank',
'Benefits: They give children a feeling of (7) ___ that they may not have elsewhere.',
'freedom',
'{"box":true,"box_subtitle":"Benefits of outdoor educational visits"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 8, 'fill_blank',
'Children learn new (8) ___ and gain self-confidence.',
'skills',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 9, 'fill_blank',
'Cost per child: (9) £ ___',
'4.95',
'{"box":true,"box_subtitle":"Practical issues"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s1_id, 10, 'fill_blank',
'Adults, such as (10) ___, free',
'leaders',
'{"box":true}', 1);

-- PART 2 — Q11-15 (Stanthorpe Twinning Association — MC A/B/C)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 11, 'multiple_choice',
'During the visit to Malatte, in France, members especially enjoyed',
'B',
'{"A":"going to a theme park.","B":"experiencing a river trip.","C":"visiting a cheese factory."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 12, 'multiple_choice',
'What will happen in Stanthorpe to mark the 25th anniversary of the Twinning Association?',
'A',
'{"A":"A tree will be planted.","B":"A garden seat will be bought.","C":"A footbridge will be built."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 13, 'multiple_choice',
'Which event raised most funds this year?',
'B',
'{"A":"the film show","B":"the pancake evening","C":"the cookery demonstration"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 14, 'multiple_choice',
'For the first evening with the French visitors host families are advised to',
'C',
'{"A":"take them for a walk round the town.","B":"go to a local restaurant.","C":"have a meal at home."}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 15, 'multiple_choice',
'On Saturday evening there will be the chance to',
'A',
'{"A":"listen to a concert.","B":"watch a match.","C":"take part in a competition."}', 1);

-- PART 2 — Q16-20 (Farley House map matching A-H)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points, image_url)
VALUES (s2_id, 16, 'fill_blank',
'Farm shop',
'G',
'{"map_matching":true,"map_title":"Farley House","letters":"A,B,C,D,E,F,G,H","hint":"Write the correct letter A-H"}',
1, 'https://vqyyoxfsitsdmmxecqka.supabase.co/storage/v1/object/public/question-images/lt5 q16-20.png');

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 17, 'fill_blank',
'Disabled entry',
'C',
'{"map_matching":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 18, 'fill_blank',
'Adventure playground',
'B',
'{"map_matching":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 19, 'fill_blank',
'Kitchen gardens',
'D',
'{"map_matching":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s2_id, 20, 'fill_blank',
'The Temple of the Four Winds',
'A',
'{"map_matching":true}', 1);

-- PART 3 — Q21-22 (Choose TWO from A-E)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 21, 'multiple_choice',
'Which TWO things did Colin find most satisfying about his bread reuse project?',
'B',
'{"A":"receiving support from local restaurants","B":"finding a good way to prevent waste","C":"overcoming problems in a basic process","D":"experimenting with designs and colours","E":"learning how to apply 3-D printing","multi":true,"select_count":2,"linked_pair":22}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 22, 'multiple_choice',
'Which TWO things — second answer',
'D',
'{"multi":true,"select_count":2,"linked_pair":21,"hidden_label":true}', 1);

-- PART 3 — Q23-24 (Choose TWO from A-E)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 23, 'multiple_choice',
'Which TWO ways do the students agree that touch-sensitive sensors for food labels could be developed in future?',
'A',
'{"A":"for use on medical products","B":"to show that food is no longer fit to eat","C":"for use with drinks as well as foods","D":"to provide applications for blind people","E":"to indicate the weight of certain foods","multi":true,"select_count":2,"linked_pair":24}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 24, 'multiple_choice',
'Which TWO ways — second answer',
'E',
'{"multi":true,"select_count":2,"linked_pair":23,"hidden_label":true}', 1);

-- PART 3 — Q25-30 (matching pool: 6 questions → 8 opinions A-H)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 25, 'multiple_choice',
'Use of local products',
'D',
'{"matching_pool":true,"pool_title":"Opinions","pool":{"A":"This is only relevant to young people.","B":"This may have disappointing results.","C":"This already seems to be widespread.","D":"Retailers should do more to encourage this.","E":"More financial support is needed for this.","F":"Most people know little about this.","G":"There should be stricter regulations about this.","H":"This could be dangerous."},"pool_instruction":"Choose SIX answers from the box and write the correct letter, A-H"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 26, 'multiple_choice',
'Reduction in unnecessary packaging',
'G',
'{"matching_pool":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 27, 'multiple_choice',
'Gluten-free and lactose-free food',
'C',
'{"matching_pool":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 28, 'multiple_choice',
'Use of branded products related to celebrity chefs',
'B',
'{"matching_pool":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 29, 'multiple_choice',
'Development of ''ghost kitchens'' for takeaway food',
'F',
'{"matching_pool":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s3_id, 30, 'multiple_choice',
'Use of mushrooms for common health concerns',
'H',
'{"matching_pool":true}', 1);

-- PART 4 — Q31-40 (Céide Fields notes box, ONE WORD ONLY)

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 31, 'fill_blank',
'In the 1930s, stones beneath the bog surface were once (31) ___',
'walls',
'{"box":true,"box_title":"Céide Fields","box_subtitle":"Discovery"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 32, 'fill_blank',
'His (32) ___ became an archaeologist and undertook an investigation of the site',
'son',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 33, 'fill_blank',
'A traditional method used by local people to dig for (33) ___ was used to identify where stones were located',
'fuel',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 34, 'fill_blank',
'Items are well preserved in the bog because of a lack of (34) ___',
'oxygen',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 35, 'fill_blank',
'Houses were (35) ___ in shape and had a hole in the roof',
'rectangular',
'{"box":true,"box_subtitle":"Neolithic farmers"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 36, 'fill_blank',
'Pots used for storage and to make (36) ___',
'lamps',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 37, 'fill_blank',
'Each field at Céide was large enough to support a big (37) ___',
'family',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 38, 'fill_blank',
'No evidence of structures to house animals during (38) ___',
'winter',
'{"box":true}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 39, 'fill_blank',
'A decline in (39) ___ quality',
'soil',
'{"box":true,"box_subtitle":"Reasons for the decline in farming"}', 1);

INSERT INTO questions (section_id, question_number, question_type, question_text, correct_answer, options, points)
VALUES (s4_id, 40, 'fill_blank',
'An increase in (40) ___',
'rain',
'{"box":true}', 1);

END $$;

