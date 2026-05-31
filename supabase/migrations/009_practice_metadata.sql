-- ============================================================
-- Targeted practice metadata
-- Per-section (passage / audio unit) difficulty and topic, used to
-- power "Targeted practice" drills (practise one question type at a
-- chosen difficulty). Topic is added now; its UI filter ships later.
-- ============================================================

alter table test_sections add column if not exists difficulty text
  check (difficulty in ('easy', 'medium', 'hard'));
alter table test_sections add column if not exists topic text;

create index if not exists idx_sections_difficulty on test_sections(difficulty);
