-- Client assignment draft answers (resume in-progress declarations)

ALTER TABLE client_assignments
  ADD COLUMN IF NOT EXISTS draft_answers JSONB,
  ADD COLUMN IF NOT EXISTS draft_step_index INTEGER,
  ADD COLUMN IF NOT EXISTS draft_saved_at TIMESTAMPTZ;
