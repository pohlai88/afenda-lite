ALTER TABLE "hr_learning_session" ADD COLUMN "primary_instructor_user_id" text;
--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "renewed_from_certification_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_renewed_from_certification_id_hr_employee_certification_id_fk" FOREIGN KEY ("renewed_from_certification_id") REFERENCES "public"."hr_employee_certification"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "session_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "assignment_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "employee_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "status" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "recorded_at" timestamp with time zone NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "recorded_by" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "created_by" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD COLUMN "updated_by" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD CONSTRAINT "hr_learning_attendance_session_id_hr_learning_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hr_learning_session"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD CONSTRAINT "hr_learning_attendance_assignment_id_hr_learning_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."hr_learning_assignment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD CONSTRAINT "hr_learning_attendance_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_learning_attendance_org_session_idx" ON "hr_learning_attendance" USING btree ("organization_id","session_id");
--> statement-breakpoint
CREATE INDEX "hr_learning_attendance_org_employee_idx" ON "hr_learning_attendance" USING btree ("organization_id","employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_attendance_org_assignment_session_uidx" ON "hr_learning_attendance" USING btree ("organization_id","assignment_id","session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_attendance_org_create_idempotency_uidx" ON "hr_learning_attendance" USING btree ("organization_id","create_idempotency_key") WHERE "hr_learning_attendance"."create_idempotency_key" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD CONSTRAINT "hr_learning_attendance_status_check" CHECK ("hr_learning_attendance"."status" IN ('present', 'absent', 'late', 'excused'));
