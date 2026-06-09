-- 023_remove_cambridge1_listening.sql
--
-- Remove the Cambridge IELTS 1 listening tests (the oldest set, with poor audio).
-- Foreign keys cascade on delete, so removing the test rows also removes their
-- sections, questions, and any user attempts/answers for them.
--
-- band_score_history is intentionally left alone: source_id there is polymorphic
-- (not a real FK), so a user's past listening scores stay as a historical record
-- — only the link back to the now-deleted attempt is dropped, which nothing uses.
--
-- NOTE: this is a permanent content deletion. Audio files in storage are separate
-- and not removed by this migration.

delete from tests
 where type = 'listening'
   and book_number = 1;
