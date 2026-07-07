-- Submission integrity: assignment linkage, evidence FK, lookup indexes (idempotent)

-- Normalize assignment emails for consistent client lookups
UPDATE client_assignments
SET client_email = lower(trim(client_email))
WHERE client_email <> lower(trim(client_email));

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES client_assignments(id) ON DELETE SET NULL;

UPDATE survey_responses sr
SET assignment_id = ca.id
FROM client_assignments ca
WHERE sr.confirmation_code IS NOT NULL
  AND ca.confirmation_code = sr.confirmation_code
  AND sr.survey_id = ca.survey_id
  AND sr.assignment_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS survey_responses_assignment_id_unique_idx
  ON survey_responses (assignment_id)
  WHERE assignment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS survey_responses_confirmation_code_idx
  ON survey_responses (confirmation_code)
  WHERE confirmation_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS client_assignments_survey_id_idx
  ON client_assignments (survey_id);

CREATE UNIQUE INDEX IF NOT EXISTS survey_questions_survey_id_id_idx
  ON survey_questions (survey_id, id);

DELETE FROM evidence_records e
WHERE NOT EXISTS (
  SELECT 1
  FROM survey_questions q
  WHERE q.id = e.question_id
    AND q.survey_id = e.survey_id
);

ALTER TABLE evidence_records DROP CONSTRAINT IF EXISTS evidence_records_question_survey_fk;

ALTER TABLE evidence_records
  ADD CONSTRAINT evidence_records_question_survey_fk
  FOREIGN KEY (survey_id, question_id)
  REFERENCES survey_questions (survey_id, id);
