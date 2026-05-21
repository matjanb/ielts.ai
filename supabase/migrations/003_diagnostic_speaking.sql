-- Add speaking assessment fields to diagnostic_data

ALTER TABLE diagnostic_data
  ADD COLUMN IF NOT EXISTS speaking_transcript TEXT,
  ADD COLUMN IF NOT EXISTS speaking_feedback    JSONB,
  ADD COLUMN IF NOT EXISTS speaking_band_estimate NUMERIC(3,1)
    CHECK (speaking_band_estimate IS NULL OR (speaking_band_estimate >= 4.0 AND speaking_band_estimate <= 9.0));
