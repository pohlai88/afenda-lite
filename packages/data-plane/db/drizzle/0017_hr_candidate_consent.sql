ALTER TABLE "hr_candidate" ADD COLUMN "consent_policy_version" text;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "consent_captured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "consent_source" text;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "retention_until" date;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "consent_withdrawn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD CONSTRAINT "hr_candidate_consent_source_check" CHECK ("consent_source" IS NULL OR "consent_source" IN ('self_service', 'recruiter_recorded', 'import'));
