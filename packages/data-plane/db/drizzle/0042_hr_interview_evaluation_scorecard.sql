ALTER TABLE "hr_interview_evaluation" ADD COLUMN IF NOT EXISTS "scorecard_json" jsonb;
--> statement-breakpoint
UPDATE "hr_interview_evaluation"
SET "scorecard_json" = '{"criteria":[{"criterionCode":"legacy","label":"Legacy evaluation","rating":3,"comment":null}]}'::jsonb
WHERE "scorecard_json" IS NULL;
--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ALTER COLUMN "scorecard_json" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD CONSTRAINT "hr_interview_evaluation_scorecard_json_check" CHECK (
	jsonb_typeof("scorecard_json") = 'object'
	AND jsonb_typeof("scorecard_json"->'criteria') = 'array'
	AND jsonb_array_length("scorecard_json"->'criteria') BETWEEN 1 AND 20
);
