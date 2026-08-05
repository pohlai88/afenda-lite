ALTER TABLE "payroll_period" DROP CONSTRAINT "payroll_period_status_check";
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD CONSTRAINT "payroll_period_status_check" CHECK ("status" IN ('open', 'inputs_locked', 'closed'));
--> statement-breakpoint
ALTER TABLE "payroll_accepted_handoff" DROP CONSTRAINT "payroll_accepted_handoff_status_check";
--> statement-breakpoint
ALTER TABLE "payroll_accepted_handoff" ADD CONSTRAINT "payroll_accepted_handoff_status_check" CHECK ("status" IN ('accepted', 'superseded', 'deferred_to_next_period'));
--> statement-breakpoint
ALTER TABLE "payroll_accepted_handoff" DROP CONSTRAINT "payroll_accepted_handoff_supersession_check";
--> statement-breakpoint
ALTER TABLE "payroll_accepted_handoff" ADD CONSTRAINT "payroll_accepted_handoff_supersession_check" CHECK (("status" = 'superseded' AND "superseded_by_handoff_id" IS NOT NULL) OR ("status" IN ('accepted', 'deferred_to_next_period') AND "superseded_by_handoff_id" IS NULL));
