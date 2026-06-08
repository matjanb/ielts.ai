-- 022_grant_question_subtype.sql
--
-- Migration 013 locked `questions` down to column-level SELECT grants (every
-- column except correct_answer). The question_subtype column added in 021 wasn't
-- in that list, so client-side reads that select it (the practice hub's
-- getPracticeFilters / getSubskillAccuracy) failed and showed "No questions".
-- Grant the new column to the same role.

grant select (question_subtype) on questions to authenticated;

-- Reload PostgREST's schema cache so the grant applies immediately.
notify pgrst, 'reload schema';
