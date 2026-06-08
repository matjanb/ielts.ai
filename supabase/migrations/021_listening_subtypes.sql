-- 021_listening_subtypes.sql
--
-- Listening questions are stored under just two coarse question_type values
-- (multiple_choice, fill_blank), but each section's instructions actually name
-- the real IELTS type per question range ("Questions 1-10: Complete the notes…",
-- "Questions 16-20: Label the map…"). This adds a question_subtype column and
-- fills it in for listening by parsing those instructions, so the practice hub /
-- weak-spots can show the real types. question_type is left untouched, so the
-- full-test renderer (which keys off options metadata + question_type) is unaffected.

alter table questions add column if not exists question_subtype text;

-- Classify one instruction segment into a real IELTS listening type.
create or replace function _ls_classify(seg text) returns text language sql immutable as $$
  select case
    when seg ~* 'label the (map|plan)'            then 'map_labelling'
    when seg ~* 'label the diagram'               then 'diagram_labelling'
    when seg ~* 'flow[ -]?chart'                  then 'flow_chart_completion'
    when seg ~* 'complete the notes'              then 'note_completion'
    when seg ~* 'complete the form'               then 'form_completion'
    when seg ~* 'complete the table'              then 'table_completion'
    when seg ~* 'complete the summary'            then 'summary_completion'
    when seg ~* 'complete the sentences'          then 'sentence_completion'
    when seg ~* 'choose (two|three) letters'      then 'multiple_choice'
    when seg ~* 'from the box|write the correct letter|\ymatch\y' then 'matching'
    when seg ~* 'choose the correct letter|circle the correct|a,? +b,? +(or|c)' then 'multiple_choice'
    when seg ~* 'answer the questions|short answer' and seg !~* 'complete' then 'short_answer'
    else null
  end
$$;

-- Find the instruction segment that covers question number `qnum` and classify it.
-- Falls back to the whole instruction, then NULL (→ keeps the coarse question_type).
create or replace function _ls_subtype(instr text, qnum int) returns text language plpgsql immutable as $$
declare
  rec record;
  lo int; hi int;
  seg text := null;
begin
  if instr is null then return null; end if;
  for rec in
    select m from regexp_matches(
      instr,
      'questions?\s+(\d+)\s*[-–to and,]*\s*(\d+)?\s*:?\s*(.*?)(?=questions?\s+\d|$)',
      'gi'
    ) as t(m)
  loop
    lo := (rec.m)[1]::int;
    hi := coalesce(nullif((rec.m)[2], '')::int, lo);
    if qnum between lo and hi then
      seg := (rec.m)[3];
    end if;
  end loop;
  if seg is null then seg := instr; end if;
  return _ls_classify(seg);
end
$$;

-- Populate subtype for every listening question from its section's instructions.
update questions q
   set question_subtype = _ls_subtype(s.instructions, q.question_number)
  from test_sections s
  join tests t on t.id = s.test_id
 where q.section_id = s.id
   and t.type = 'listening';

drop function if exists _ls_subtype(text, int);
drop function if exists _ls_classify(text);
