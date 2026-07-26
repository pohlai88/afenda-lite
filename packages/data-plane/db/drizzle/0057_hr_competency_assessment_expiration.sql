ALTER TABLE "hr_competency_assessment" ADD COLUMN "expires_on" date;--> statement-breakpoint
ALTER TABLE "hr_competency_assessment" DROP CONSTRAINT "hr_competency_assessment_status_check";--> statement-breakpoint
ALTER TABLE "hr_competency_assessment" ADD CONSTRAINT "hr_competency_assessment_status_check" CHECK ("hr_competency_assessment"."status" IN ('current', 'superseded', 'expired'));--> statement-breakpoint
ALTER TABLE "hr_competency_assessment" ADD CONSTRAINT "hr_competency_assessment_expires_after_effective_ck" CHECK ("expires_on" IS NULL OR "expires_on" > "effective_on");
