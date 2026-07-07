-- Portal query performance indexes and data integrity constraints (idempotent)

-- Client assignment hot paths: list by email, active lookup, pending dashboard count
CREATE INDEX IF NOT EXISTS client_assignments_email_created_at_idx
  ON client_assignments (client_email, created_at DESC);

CREATE INDEX IF NOT EXISTS client_assignments_email_survey_status_idx
  ON client_assignments (client_email, survey_id, status);

CREATE INDEX IF NOT EXISTS client_assignments_pending_idx
  ON client_assignments (status)
  WHERE status = 'pending';

-- Prevent duplicate open assignments for the same client + declaration
CREATE UNIQUE INDEX IF NOT EXISTS client_assignments_active_unique_idx
  ON client_assignments (client_email, survey_id)
  WHERE status <> 'submitted';

-- Ordered question lists and evidence scoped by survey
CREATE INDEX IF NOT EXISTS survey_questions_survey_sort_idx
  ON survey_questions (survey_id, sort_order);

CREATE INDEX IF NOT EXISTS evidence_records_survey_id_idx
  ON evidence_records (survey_id);

-- Normalize email storage for case-insensitive lookups
CREATE INDEX IF NOT EXISTS client_assignments_email_lower_idx
  ON client_assignments (lower(client_email));

-- Status domain constraints (idempotent drop + add)
ALTER TABLE client_assignments DROP CONSTRAINT IF EXISTS client_assignments_status_check;
ALTER TABLE client_assignments
  ADD CONSTRAINT client_assignments_status_check
  CHECK (status IN ('pending', 'submitted'));

ALTER TABLE client_invitations DROP CONSTRAINT IF EXISTS client_invitations_status_check;
ALTER TABLE client_invitations
  ADD CONSTRAINT client_invitations_status_check
  CHECK (status IN ('pending', 'accepted', 'expired'));
