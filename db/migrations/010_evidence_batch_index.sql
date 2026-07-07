-- Evidence batch lookup by survey + id list (S4 file answers)

CREATE INDEX IF NOT EXISTS evidence_records_survey_id_id_idx
  ON evidence_records (survey_id, id);
