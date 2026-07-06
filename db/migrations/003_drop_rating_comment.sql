-- Remove legacy rating/comment columns after code no longer references them
ALTER TABLE survey_responses DROP COLUMN IF EXISTS rating;
ALTER TABLE survey_responses DROP COLUMN IF EXISTS comment;
