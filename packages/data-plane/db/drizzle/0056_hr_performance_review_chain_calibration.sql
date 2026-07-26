ALTER TABLE "hr_performance_review" ADD COLUMN IF NOT EXISTS "calibration_note" text;
--> statement-breakpoint
ALTER TABLE "hr_performance_review_participant" ADD COLUMN IF NOT EXISTS "sequence_number" integer;
--> statement-breakpoint
UPDATE "hr_performance_review_participant"
SET "sequence_number" = CASE
	WHEN "role" = 'self' THEN 0
	WHEN "role" = 'manager' THEN 1000
	ELSE 1
END
WHERE "sequence_number" IS NULL;
--> statement-breakpoint
ALTER TABLE "hr_performance_review_participant" ALTER COLUMN "sequence_number" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_performance_assessment" ADD COLUMN IF NOT EXISTS "participant_id" uuid;
--> statement-breakpoint
UPDATE "hr_performance_assessment" AS a
SET "participant_id" = p."id"
FROM "hr_performance_review_participant" AS p
WHERE a."review_id" = p."review_id"
	AND a."organization_id" = p."organization_id"
	AND a."kind" = p."role"
	AND a."participant_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "hr_performance_assessment" ALTER COLUMN "participant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_performance_assessment" DROP CONSTRAINT IF EXISTS "hr_performance_assessment_kind_check";
--> statement-breakpoint
ALTER TABLE "hr_performance_assessment" ADD CONSTRAINT "hr_performance_assessment_kind_check" CHECK ("kind" IN ('self', 'manager', 'delegated'));
--> statement-breakpoint
DROP INDEX IF EXISTS "hr_performance_assessment_org_review_kind_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_assessment_org_review_participant_uidx" ON "hr_performance_assessment" USING btree ("organization_id","review_id","participant_id");
--> statement-breakpoint
ALTER TABLE "hr_performance_assessment" ADD CONSTRAINT "hr_performance_assessment_participant_id_hr_performance_review_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."hr_performance_review_participant"("id") ON DELETE no action ON UPDATE no action;
