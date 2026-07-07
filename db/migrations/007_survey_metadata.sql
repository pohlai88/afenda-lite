-- Survey metadata and per-question advanced config (CDP package v1)

ALTER TABLE surveys ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS case_number TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS submit_before TIMESTAMPTZ;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS surveyor_name TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS surveyor_org TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS surveyee_individual TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS surveyee_org TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';
