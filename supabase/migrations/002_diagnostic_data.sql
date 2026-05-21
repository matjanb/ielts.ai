-- Diagnostic data collected pre-signup during the onboarding diagnostic flow

CREATE TABLE IF NOT EXISTS diagnostic_data (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  taken_ielts_before  BOOLEAN,
  ielts_type          TEXT CHECK (ielts_type IN ('academic', 'general_training')),
  target_band         NUMERIC(3, 1),
  estimated_band      NUMERIC(3, 1),
  exam_date           TEXT CHECK (exam_date IN ('within_1_month', '1_3_months', '3_6_months', 'not_sure')),
  daily_study_time    TEXT CHECK (daily_study_time IN ('30_min', '1_hour', '2_hours', '3_plus_hours')),
  weakest_skills      TEXT[] DEFAULT '{}',
  biggest_struggle    TEXT,
  diagnostic_score    NUMERIC(3, 1),
  recommended_plan    TEXT,
  diagnostic_completed BOOLEAN DEFAULT FALSE,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Row-level security
ALTER TABLE diagnostic_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnostic data"
  ON diagnostic_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostic data"
  ON diagnostic_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diagnostic data"
  ON diagnostic_data FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_diagnostic_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diagnostic_data_updated_at
  BEFORE UPDATE ON diagnostic_data
  FOR EACH ROW EXECUTE FUNCTION update_diagnostic_data_updated_at();
