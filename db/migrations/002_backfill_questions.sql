-- Backfill survey_questions from surveys.question for legacy declarations
INSERT INTO survey_questions (survey_id, prompt, type, required, sort_order)
SELECT s.id,
       COALESCE(NULLIF(TRIM(s.question), ''), 'Please complete this declaration.'),
       'text',
       TRUE,
       0
FROM surveys s
WHERE NOT EXISTS (
  SELECT 1 FROM survey_questions q WHERE q.survey_id = s.id
);
