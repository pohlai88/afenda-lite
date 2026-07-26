ALTER TABLE "hr_performance_goal" ADD COLUMN "goal_kind" text DEFAULT 'employee' NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD COLUMN "aligned_to_goal_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD COLUMN "completion_note" text;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD COLUMN "completion_evidence_reference" text;--> statement-breakpoint
ALTER TABLE "hr_performance_goal_progress" ADD COLUMN "evidence_reference" text;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_goal_kind_check" CHECK ("goal_kind" IN ('employee', 'manager'));--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_aligned_to_goal_id_hr_performance_goal_id_fk" FOREIGN KEY ("aligned_to_goal_id") REFERENCES "public"."hr_performance_goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_aligned_idx" ON "hr_performance_goal" USING btree ("organization_id","aligned_to_goal_id");
