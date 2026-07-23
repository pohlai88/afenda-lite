ALTER TABLE "hr_work_calendar" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "hr_work_calendar" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
UPDATE "hr_work_calendar"
SET "create_idempotency_key" = 'migrated-' || "id"::text
WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "hr_work_calendar"
SET "create_request_fingerprint" = 'migrated'
WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
ALTER TABLE "hr_work_calendar" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_work_calendar" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_work_calendar_org_create_idempotency_uidx" ON "hr_work_calendar" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_shift" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"shift_kind" text NOT NULL,
	"start_local" text NOT NULL,
	"end_local" text NOT NULL,
	"is_overnight" boolean DEFAULT false NOT NULL,
	"expected_minutes" integer NOT NULL,
	"grace_early_minutes" integer DEFAULT 0 NOT NULL,
	"grace_late_minutes" integer DEFAULT 0 NOT NULL,
	"min_duration_minutes" integer,
	"max_duration_minutes" integer,
	"earliest_clock_in_local" text,
	"latest_clock_out_local" text,
	"overtime_eligible" boolean DEFAULT true NOT NULL,
	"timezone" text,
	"location_key" text,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_shift_kind_check" CHECK ("shift_kind" IN ('fixed', 'flexible', 'split', 'rest_day', 'public_holiday')),
	CONSTRAINT "hr_shift_status_check" CHECK ("status" IN ('draft', 'active', 'inactive')),
	CONSTRAINT "hr_shift_expected_minutes_check" CHECK ("expected_minutes" > 0 AND "expected_minutes" <= 1440)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_shift_break" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"shift_id" uuid NOT NULL,
	"break_order" integer DEFAULT 1 NOT NULL,
	"start_offset_minutes" integer,
	"duration_minutes" integer NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_shift_break_duration_check" CHECK ("duration_minutes" > 0 AND "duration_minutes" <= 720)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_shift_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid,
	"shift_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location_key" text,
	"timezone" text NOT NULL,
	"publication_status" text NOT NULL,
	"assignment_source" text DEFAULT 'manual' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_shift_assignment_status_check" CHECK ("publication_status" IN ('planned', 'published', 'changed', 'cancelled', 'completed')),
	CONSTRAINT "hr_shift_assignment_range_check" CHECK ("ends_at" > "starts_at")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_shift_assignment_segment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"assignment_id" uuid NOT NULL,
	"segment_order" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_shift_assignment_segment_range_check" CHECK ("ends_at" > "starts_at")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_attendance_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid,
	"shift_assignment_id" uuid,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"source_timezone" text NOT NULL,
	"local_work_date" date NOT NULL,
	"source" text NOT NULL,
	"source_reference" text,
	"device_metadata" jsonb,
	"location_key" text,
	"notes" text,
	"payload_checksum" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_attendance_event_type_check" CHECK ("event_type" IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'manual_adjustment')),
	CONSTRAINT "hr_attendance_event_source_check" CHECK ("source" IN ('self', 'supervisor', 'import', 'system', 'manual'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_attendance_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid,
	"shift_assignment_id" uuid,
	"local_work_date" date NOT NULL,
	"timezone" text NOT NULL,
	"first_clock_in_at" timestamp with time zone,
	"final_clock_out_at" timestamp with time zone,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"worked_minutes" integer DEFAULT 0 NOT NULL,
	"gross_minutes" integer DEFAULT 0 NOT NULL,
	"resolution_status" text NOT NULL,
	"requires_review" boolean DEFAULT false NOT NULL,
	"provenance" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_attendance_session_status_check" CHECK ("resolution_status" IN ('incomplete', 'resolved', 'needs_review', 'voided')),
	CONSTRAINT "hr_attendance_session_minutes_check" CHECK ("break_minutes" >= 0 AND "worked_minutes" >= 0 AND "gross_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_attendance_exception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"session_id" uuid,
	"event_id" uuid,
	"shift_assignment_id" uuid,
	"exception_type" text NOT NULL,
	"severity" text NOT NULL,
	"detected_facts" jsonb,
	"review_status" text NOT NULL,
	"resolution" text,
	"reviewer_user_id" text,
	"evidence_reference" text,
	"remarks" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_attendance_exception_type_check" CHECK ("exception_type" IN ('late_arrival', 'early_departure', 'absence', 'missing_clock_in', 'missing_clock_out', 'unplanned_attendance', 'overlapping_attendance', 'excessive_break', 'insufficient_rest', 'schedule_mismatch', 'location_mismatch', 'overtime_candidate')),
	CONSTRAINT "hr_attendance_exception_severity_check" CHECK ("severity" IN ('info', 'warning', 'critical')),
	CONSTRAINT "hr_attendance_exception_status_check" CHECK ("review_status" IN ('open', 'in_review', 'excused', 'rejected', 'resolved'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_attendance_adjustment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"previous_occurred_at" timestamp with time zone NOT NULL,
	"new_occurred_at" timestamp with time zone NOT NULL,
	"adjustment_reason" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_timesheet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" text NOT NULL,
	"total_recorded_minutes" integer DEFAULT 0 NOT NULL,
	"total_approved_minutes" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"returned_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"approver_notes" text,
	"rejection_reason" text,
	"supersedes_timesheet_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_timesheet_status_check" CHECK ("status" IN ('draft', 'submitted', 'returned', 'approved', 'rejected', 'locked', 'superseded')),
	CONSTRAINT "hr_timesheet_period_check" CHECK ("period_end" >= "period_start"),
	CONSTRAINT "hr_timesheet_minutes_check" CHECK ("total_recorded_minutes" >= 0 AND "total_approved_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_timesheet_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"timesheet_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"timezone" text NOT NULL,
	"source_type" text NOT NULL,
	"source_reference" text,
	"time_type" text NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"recorded_minutes" integer NOT NULL,
	"approved_minutes" integer NOT NULL,
	"cost_center_id" text,
	"project_id" text,
	"location_id" text,
	"department_id" text,
	"approval_reference" text,
	"evidence_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_timesheet_entry_source_type_check" CHECK ("source_type" IN ('attendance', 'schedule', 'manual', 'leave', 'external')),
	CONSTRAINT "hr_timesheet_entry_time_type_check" CHECK ("time_type" IN ('regular', 'overtime', 'rest_day', 'public_holiday', 'night', 'call_back', 'training', 'travel', 'standby', 'unpaid')),
	CONSTRAINT "hr_timesheet_entry_minutes_check" CHECK ("recorded_minutes" >= 0 AND "approved_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_overtime_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid,
	"overtime_type" text NOT NULL,
	"requested_starts_at" timestamp with time zone NOT NULL,
	"requested_ends_at" timestamp with time zone NOT NULL,
	"requested_minutes" integer NOT NULL,
	"approved_maximum_minutes" integer,
	"actual_minutes" integer,
	"payroll_approved_minutes" integer,
	"reason" text NOT NULL,
	"evidence_reference" text,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_overtime_request_type_check" CHECK ("overtime_type" IN ('weekday_overtime', 'rest_day_overtime', 'public_holiday_overtime', 'night_overtime', 'call_back', 'emergency_overtime')),
	CONSTRAINT "hr_overtime_request_status_check" CHECK ("status" IN ('requested', 'approved', 'rejected', 'worked', 'verified', 'cancelled')),
	CONSTRAINT "hr_overtime_request_range_check" CHECK ("requested_ends_at" > "requested_starts_at"),
	CONSTRAINT "hr_overtime_request_minutes_check" CHECK ("requested_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_overtime_approval" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"overtime_request_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"approved_maximum_minutes" integer,
	"actor_user_id" text NOT NULL,
	"authority" text,
	"comment" text,
	"decided_at" timestamp with time zone NOT NULL,
	"correlation_id" text,
	"version_approved" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_overtime_approval_decision_check" CHECK ("decision" IN ('approved', 'rejected', 'verified', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "hr_shift_break" ADD CONSTRAINT "hr_shift_break_shift_id_hr_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."hr_shift"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_shift_assignment" ADD CONSTRAINT "hr_shift_assignment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_shift_assignment" ADD CONSTRAINT "hr_shift_assignment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_shift_assignment" ADD CONSTRAINT "hr_shift_assignment_shift_id_hr_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."hr_shift"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_shift_assignment_segment" ADD CONSTRAINT "hr_shift_assignment_segment_assignment_id_hr_shift_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."hr_shift_assignment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_event" ADD CONSTRAINT "hr_attendance_event_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_event" ADD CONSTRAINT "hr_attendance_event_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_event" ADD CONSTRAINT "hr_attendance_event_shift_assignment_id_hr_shift_assignment_id_fk" FOREIGN KEY ("shift_assignment_id") REFERENCES "public"."hr_shift_assignment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_session" ADD CONSTRAINT "hr_attendance_session_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_session" ADD CONSTRAINT "hr_attendance_session_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_session" ADD CONSTRAINT "hr_attendance_session_shift_assignment_id_hr_shift_assignment_id_fk" FOREIGN KEY ("shift_assignment_id") REFERENCES "public"."hr_shift_assignment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_exception" ADD CONSTRAINT "hr_attendance_exception_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_exception" ADD CONSTRAINT "hr_attendance_exception_session_id_hr_attendance_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hr_attendance_session"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_exception" ADD CONSTRAINT "hr_attendance_exception_event_id_hr_attendance_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."hr_attendance_event"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_exception" ADD CONSTRAINT "hr_attendance_exception_shift_assignment_id_hr_shift_assignment_id_fk" FOREIGN KEY ("shift_assignment_id") REFERENCES "public"."hr_shift_assignment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_adjustment" ADD CONSTRAINT "hr_attendance_adjustment_event_id_hr_attendance_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."hr_attendance_event"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_timesheet" ADD CONSTRAINT "hr_timesheet_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_timesheet" ADD CONSTRAINT "hr_timesheet_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_timesheet" ADD CONSTRAINT "hr_timesheet_supersedes_timesheet_id_hr_timesheet_id_fk" FOREIGN KEY ("supersedes_timesheet_id") REFERENCES "public"."hr_timesheet"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_timesheet_entry" ADD CONSTRAINT "hr_timesheet_entry_timesheet_id_hr_timesheet_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."hr_timesheet"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_timesheet_entry" ADD CONSTRAINT "hr_timesheet_entry_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_overtime_request" ADD CONSTRAINT "hr_overtime_request_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_overtime_request" ADD CONSTRAINT "hr_overtime_request_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_overtime_approval" ADD CONSTRAINT "hr_overtime_approval_overtime_request_id_hr_overtime_request_id_fk" FOREIGN KEY ("overtime_request_id") REFERENCES "public"."hr_overtime_request"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_shift_org_id_idx" ON "hr_shift" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_shift_org_status_idx" ON "hr_shift" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_shift_org_code_effective_uidx" ON "hr_shift" USING btree ("organization_id","code","effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_shift_org_create_idempotency_uidx" ON "hr_shift" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_shift_break_org_id_idx" ON "hr_shift_break" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_shift_break_org_shift_idx" ON "hr_shift_break" USING btree ("organization_id","shift_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_shift_assignment_org_id_idx" ON "hr_shift_assignment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_shift_assignment_org_employee_date_idx" ON "hr_shift_assignment" USING btree ("organization_id","employee_id","scheduled_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_shift_assignment_org_status_idx" ON "hr_shift_assignment" USING btree ("organization_id","publication_status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_shift_assignment_org_create_idempotency_uidx" ON "hr_shift_assignment" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_shift_assignment_segment_org_id_idx" ON "hr_shift_assignment_segment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_shift_assignment_segment_org_assignment_idx" ON "hr_shift_assignment_segment" USING btree ("organization_id","assignment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_event_org_id_idx" ON "hr_attendance_event" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_event_org_employee_date_idx" ON "hr_attendance_event" USING btree ("organization_id","employee_id","local_work_date");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_attendance_event_org_create_idempotency_uidx" ON "hr_attendance_event" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_attendance_event_org_source_ref_uidx" ON "hr_attendance_event" USING btree ("organization_id","source","source_reference") WHERE "source_reference" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_session_org_id_idx" ON "hr_attendance_session" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_session_org_employee_date_idx" ON "hr_attendance_session" USING btree ("organization_id","employee_id","local_work_date");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_attendance_session_org_create_idempotency_uidx" ON "hr_attendance_session" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_exception_org_id_idx" ON "hr_attendance_exception" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_exception_org_employee_idx" ON "hr_attendance_exception" USING btree ("organization_id","employee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_exception_org_status_idx" ON "hr_attendance_exception" USING btree ("organization_id","review_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_adjustment_org_id_idx" ON "hr_attendance_adjustment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_adjustment_org_event_idx" ON "hr_attendance_adjustment" USING btree ("organization_id","event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_timesheet_org_id_idx" ON "hr_timesheet" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_timesheet_org_employee_idx" ON "hr_timesheet" USING btree ("organization_id","employee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_timesheet_org_status_idx" ON "hr_timesheet" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_timesheet_org_create_idempotency_uidx" ON "hr_timesheet" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_timesheet_org_employee_period_active_uidx" ON "hr_timesheet" USING btree ("organization_id","employee_id","period_start","period_end") WHERE "status" NOT IN ('superseded', 'rejected');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_timesheet_entry_org_id_idx" ON "hr_timesheet_entry" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_timesheet_entry_org_timesheet_idx" ON "hr_timesheet_entry" USING btree ("organization_id","timesheet_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_timesheet_entry_org_employee_date_idx" ON "hr_timesheet_entry" USING btree ("organization_id","employee_id","work_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_overtime_request_org_id_idx" ON "hr_overtime_request" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_overtime_request_org_employee_idx" ON "hr_overtime_request" USING btree ("organization_id","employee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_overtime_request_org_status_idx" ON "hr_overtime_request" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_overtime_request_org_create_idempotency_uidx" ON "hr_overtime_request" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_overtime_approval_org_id_idx" ON "hr_overtime_approval" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_overtime_approval_org_request_idx" ON "hr_overtime_approval" USING btree ("organization_id","overtime_request_id");
