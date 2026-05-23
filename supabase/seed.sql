-- ============================================================
-- Seed: Cambridge IELTS 1 Practice Test 1 — Listening
-- REAL questions extracted from the official book
-- ============================================================
 
insert into tests (id, title, type, book_number, test_number, difficulty)
values (
  '11111111-0001-0001-0001-000000000001',
  'Cambridge IELTS 1 — Practice Test 1 Listening',
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