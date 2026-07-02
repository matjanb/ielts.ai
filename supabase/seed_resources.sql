-- seed_resources.sql — starter resource matrix for the coach agent.
--
-- PLACEHOLDER external links (marked TODO) — replace with real curated URLs
-- before the evening agent goes live. internal_drill URLs are real today:
-- the practice flow already supports /{skill}/practice?type=<question_type>.
-- Instructions are in English: they are INPUT for the AI formulator, which
-- rewrites them in the user's language — not shown to users verbatim.
--
-- Re-runnable as the source of truth: upsert on (module, problem_tag, title),
-- so editing a url/instruction here and re-running the whole file updates the
-- live rows in place.

insert into resources (module, problem_tag, resource_type, title, url, instruction) values

-- ── Listening ────────────────────────────────────────────────────────────────
('listening', 'general_plateau', 'podcast', 'BBC 6 Minute English',
 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english', -- TODO confirm
 'Listen 10 min/day without subtitles. Catch the gist first, replay for detail.'),
('listening', 'general_plateau', 'ted', 'TED-Ed (short talks)',
 'https://ed.ted.com/', -- TODO pick 2-3 specific talks
 'One short talk a day, no subtitles. Note 3 phrases you heard but would not have written.'),
('listening', 'accents', 'video', 'Accent sampler: UK / Australian / NZ',
 'https://example.com/TODO-accents',
 'Watch 5-10 min/day rotating accents. Goal: stop "translating" the accent, just follow.'),
('listening', 'part3_discussion', 'ted', 'TED debate-style talk (multiple speakers)',
 'https://example.com/TODO-ted-debate',
 'Listen for WHO says WHAT, not every word. After: write one line per speaker''s position.'),
('listening', 'note_completion', 'internal_drill', 'Note completion drill',
 '/listening/practice?type=note_completion',
 'Timed drill on your weakest type. Before the audio: predict the word type (noun? number?) for each gap.'),
('listening', 'map_labelling', 'internal_drill', 'Map labelling drill',
 '/listening/practice?type=map_labelling',
 'Before the audio starts, read the map aloud mentally: left/right, across from, next to.'),
('listening', 'form_completion', 'internal_drill', 'Form completion drill',
 '/listening/practice?type=form_completion',
 'Focus on numbers, names and spelling — that is where form questions lose points.'),
('listening', 'matching', 'internal_drill', 'Matching drill (listening)',
 '/listening/practice?type=matching',
 'Read all options before the audio; cross out used letters as you go.'),
('listening', 'multiple_choice', 'internal_drill', 'Multiple choice drill (listening)',
 '/listening/practice?type=multiple_choice',
 'The recording will mention several options — listen for the correction ("actually", "but").'),

-- ── Reading ──────────────────────────────────────────────────────────────────
('reading', 'general_plateau', 'article', 'The Guardian / BBC Future / Nat Geo',
 'https://example.com/TODO-articles',
 'One article a day + 5 new words with example sentences. Alternate topics you would avoid.'),
('reading', 'skimming', 'guide', 'Skimming & scanning technique',
 'https://example.com/TODO-skimming',
 'Practice: 2 minutes per passage — title, first/last sentence of each paragraph, then say the topic aloud.'),
('reading', 'true_false', 'internal_drill', 'True/False/Not Given drill',
 '/reading/practice?type=true_false',
 'The trap is FALSE vs NOT GIVEN: FALSE contradicts the text, NOT GIVEN is absent from it. Verbalize which one and why.'),
('reading', 'fill_blank', 'internal_drill', 'Gap fill drill (reading)',
 '/reading/practice?type=fill_blank',
 'Read around the gap first — grammar tells you the word type before you scan for it.'),
('reading', 'matching', 'internal_drill', 'Matching drill (reading)',
 '/reading/practice?type=matching',
 'Do NOT read paragraphs in order — scan for the option''s keywords and their synonyms.'),
('reading', 'multiple_choice', 'internal_drill', 'Multiple choice drill (reading)',
 '/reading/practice?type=multiple_choice',
 'Eliminate two options by contradiction before choosing between the last two.'),

-- ── Writing ──────────────────────────────────────────────────────────────────
('writing', 'general_plateau', 'guide', 'Band 8 sample essays, annotated',
 'https://example.com/TODO-band8-samples',
 'Read one band-8 essay per day. Copy its paragraph skeleton, then write yours into the same skeleton.'),
('writing', 'task_structure', 'guide', 'Task 2 structure template',
 'https://example.com/TODO-task2-structure',
 'One position, two body paragraphs, one idea each, developed fully. Depth beats breadth.'),

-- ── Speaking ─────────────────────────────────────────────────────────────────
('speaking', 'fluency', 'video', 'Shadowing technique',
 'https://example.com/TODO-shadowing',
 'Shadow a 1-2 min native clip daily: play, repeat aloud in sync, match the rhythm, ignore mistakes.'),
('speaking', 'general_plateau', 'guide', 'Part 2 long-turn framework',
 'https://example.com/TODO-part2-framework',
 'Structure the 2 minutes: what → details → why it matters → one story. Record yourself once a day.'),

-- ── Vocabulary ───────────────────────────────────────────────────────────────
('vocabulary', 'weak_vocab', 'internal_drill', 'Vocabulary decks (spaced repetition)',
 '/vocabulary',
 'Ten minutes daily beats an hour weekly — the review queue does the scheduling for you.')

on conflict (module, problem_tag, title) do update set
  url           = excluded.url,
  instruction   = excluded.instruction,
  resource_type = excluded.resource_type,
  is_active     = true;
