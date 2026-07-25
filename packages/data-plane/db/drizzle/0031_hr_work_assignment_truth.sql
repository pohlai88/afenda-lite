ALTER TABLE "hr_work_assignment" ADD COLUMN IF NOT EXISTS "predecessor_assignment_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN IF NOT EXISTS "successor_assignment_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN IF NOT EXISTS "transfer_movement_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN IF NOT EXISTS "manager_employee_id_snapshot" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN IF NOT EXISTS "work_calendar_id_snapshot" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_predecessor_assignment_fk" FOREIGN KEY ("predecessor_assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_successor_assignment_fk" FOREIGN KEY ("successor_assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_transfer_movement_fk" FOREIGN KEY ("transfer_movement_id") REFERENCES "public"."hr_employment_movement"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_manager_employee_id_snapshot_hr_employee_id_fk" FOREIGN KEY ("manager_employee_id_snapshot") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_work_calendar_id_snapshot_hr_work_calendar_id_fk" FOREIGN KEY ("work_calendar_id_snapshot") REFERENCES "public"."hr_work_calendar"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_work_assignment_org_employment_starts_idx" ON "hr_work_assignment" USING btree ("organization_id","employment_id","starts_on");
