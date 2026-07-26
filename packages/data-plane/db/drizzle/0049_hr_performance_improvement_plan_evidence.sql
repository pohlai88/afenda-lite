ALTER TABLE "hr_performance_improvement_checkpoint" ADD COLUMN "evidence_reference" text;--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD COLUMN "outcome_reason" text;--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD COLUMN "outcome_evidence_reference" text;--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD COLUMN "last_extension_reason" text;--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD COLUMN "last_extension_evidence_reference" text;
