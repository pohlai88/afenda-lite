-- Portal query indexes and observability (idempotent)

CREATE INDEX IF NOT EXISTS client_invitations_email_idx
  ON client_invitations (lower(email));

CREATE INDEX IF NOT EXISTS surveys_user_id_created_at_idx
  ON surveys (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS survey_invitations_survey_id_idx
  ON survey_invitations (survey_id);

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
