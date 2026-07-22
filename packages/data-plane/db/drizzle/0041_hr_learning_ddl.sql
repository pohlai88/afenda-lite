ALTER TABLE "hr_learning_course" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_course" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_course" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "hr_learning_course" ADD COLUMN "duration_hours" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "hr_learning_course" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_course" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_course" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_course" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_course" ADD CONSTRAINT "hr_learning_course_status_check" CHECK ("status" IN ('active', 'archived'));--> statement-breakpoint
CREATE INDEX "hr_learning_course_org_status_idx" ON "hr_learning_course" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_course_org_code_uidx" ON "hr_learning_course" USING btree ("organization_id","code");--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "scheduled_starts_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "scheduled_ends_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "actual_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "actual_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD CONSTRAINT "hr_learning_session_course_id_hr_learning_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hr_learning_course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD CONSTRAINT "hr_learning_session_status_check" CHECK ("status" IN ('scheduled', 'in_progress', 'completed', 'cancelled'));--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD CONSTRAINT "hr_learning_session_scheduled_range_check" CHECK ("scheduled_ends_at" >= "scheduled_starts_at");--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD CONSTRAINT "hr_learning_session_actual_range_check" CHECK ("actual_ends_at" IS NULL OR "actual_starts_at" IS NULL OR "actual_ends_at" >= "actual_starts_at");--> statement-breakpoint
CREATE INDEX "hr_learning_session_org_course_idx" ON "hr_learning_session" USING btree ("organization_id","course_id");--> statement-breakpoint
CREATE INDEX "hr_learning_session_org_status_idx" ON "hr_learning_session" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_session_org_code_uidx" ON "hr_learning_session" USING btree ("organization_id","code");--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD COLUMN "assigned_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD COLUMN "assigned_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD COLUMN "due_on" date;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD CONSTRAINT "hr_learning_assignment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD CONSTRAINT "hr_learning_assignment_course_id_hr_learning_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hr_learning_course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD CONSTRAINT "hr_learning_assignment_session_id_hr_learning_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hr_learning_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD CONSTRAINT "hr_learning_assignment_status_check" CHECK ("status" IN ('pending', 'in_progress', 'completed', 'withdrawn'));--> statement-breakpoint
CREATE INDEX "hr_learning_assignment_org_employee_idx" ON "hr_learning_assignment" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_learning_assignment_org_course_idx" ON "hr_learning_assignment" USING btree ("organization_id","course_id");--> statement-breakpoint
CREATE INDEX "hr_learning_assignment_org_session_idx" ON "hr_learning_assignment" USING btree ("organization_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_assignment_org_employee_course_active_uidx" ON "hr_learning_assignment" USING btree ("organization_id","employee_id","course_id") WHERE "status" IN ('pending', 'in_progress');--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "assignment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "completed_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "outcome" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "assessor_user_id" text;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD CONSTRAINT "hr_learning_completion_assignment_id_hr_learning_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."hr_learning_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD CONSTRAINT "hr_learning_completion_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD CONSTRAINT "hr_learning_completion_course_id_hr_learning_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hr_learning_course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD CONSTRAINT "hr_learning_completion_session_id_hr_learning_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hr_learning_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD CONSTRAINT "hr_learning_completion_outcome_check" CHECK ("outcome" IN ('passed', 'failed', 'attended'));--> statement-breakpoint
CREATE INDEX "hr_learning_completion_org_employee_idx" ON "hr_learning_completion" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_learning_completion_org_course_idx" ON "hr_learning_completion" USING btree ("organization_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_completion_org_assignment_uidx" ON "hr_learning_completion" USING btree ("organization_id","assignment_id");--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "completion_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "certification_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "issued_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "expires_on" date;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "revoked_by" text;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_course_id_hr_learning_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hr_learning_course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_completion_id_hr_learning_completion_id_fk" FOREIGN KEY ("completion_id") REFERENCES "public"."hr_learning_completion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_status_check" CHECK ("status" IN ('active', 'expired', 'revoked'));--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_expiry_check" CHECK ("expires_on" IS NULL OR "expires_on" >= "issued_on");--> statement-breakpoint
CREATE INDEX "hr_employee_certification_org_employee_idx" ON "hr_employee_certification" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_employee_certification_org_course_idx" ON "hr_employee_certification" USING btree ("organization_id","course_id");--> statement-breakpoint
CREATE INDEX "hr_employee_certification_org_status_idx" ON "hr_employee_certification" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_certification_org_completion_uidx" ON "hr_employee_certification" USING btree ("organization_id","completion_id");
