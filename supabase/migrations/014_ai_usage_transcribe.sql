-- 014_ai_usage_transcribe.sql
--
-- The transcription endpoint (Whisper) was previously ungated and unmetered.
-- It is now subscription-gated and counted toward a daily quota like the other
-- AI features, so it needs to be an allowed `feature` value in ai_usage.

alter table ai_usage drop constraint if exists ai_usage_feature_check;
alter table ai_usage add constraint ai_usage_feature_check
  check (feature in (
    'writing', 'speaking', 'study_plan', 'band_estimate', 'test_explanation', 'transcribe'
  ));
