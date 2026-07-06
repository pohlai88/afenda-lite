-- Client Declaration Portal schema (idempotent)

CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  comment TEXT,
  answers JSONB,
  confirmation_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS survey_responses_survey_id_idx
  ON survey_responses (survey_id);

CREATE TABLE IF NOT EXISTS survey_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS survey_invite_tokens_survey_id_idx
  ON survey_invite_tokens (survey_id);

CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('yes_no', 'text', 'file')),
  required BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS survey_questions_survey_id_idx
  ON survey_questions (survey_id);

CREATE TABLE IF NOT EXISTS evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_profiles (
  user_id UUID PRIMARY KEY,
  phone TEXT,
  entity_name TEXT,
  jurisdiction TEXT,
  notes TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  assigned_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  confirmation_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_assignments_email_idx
  ON client_assignments (client_email);

-- Upgrade existing deployments
ALTER TABLE survey_responses ALTER COLUMN rating DROP NOT NULL;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS confirmation_code TEXT;
