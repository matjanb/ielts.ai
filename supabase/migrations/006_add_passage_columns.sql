-- Add passage_text and passage_group to questions table.
-- passage_text: the full passage fragment containing {{Q}} as the answer placeholder.
-- passage_group: groups consecutive questions that form one flowing passage paragraph.
-- Questions without passage_text retain their current rendering (MC, form card, etc.).
ALTER TABLE questions ADD COLUMN IF NOT EXISTS passage_text TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS passage_group INTEGER;
