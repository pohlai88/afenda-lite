CREATE TABLE IF NOT EXISTS "hr_time_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"minimum_rest_minutes" integer NOT NULL,
	"automatic_break_after_minutes" integer,
	"automatic_break_minutes" integer DEFAULT 0 NOT NULL,
	"approval_steps" jsonb DEFAULT '["line_manager"]'::jsonb NOT NULL,
	"supersedes_policy_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_time_policy_status_check" CHECK ("status" IN ('draft', 'active', 'superseded', 'archived')),
	CONSTRAINT "hr_time_policy_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
	CONSTRAINT "hr_time_policy_minimum_rest_check" CHECK ("minimum_rest_minutes" >= 0 AND "minimum_rest_minutes" <= 2880),
	CONSTRAINT "hr_time_policy_break_check" CHECK (
		"automatic_break_minutes" >= 0
		AND "automatic_break_minutes" <= 1440
		AND (
			("automatic_break_after_minutes" IS NULL AND "automatic_break_minutes" = 0)
			OR (
				"automatic_break_after_minutes" > 0
				AND "automatic_break_after_minutes" <= 1440
				AND "automatic_break_minutes" <= "automatic_break_after_minutes"
			)
		)
	),
	CONSTRAINT "hr_time_policy_approval_steps_check" CHECK (
		jsonb_typeof("approval_steps") = 'array'
		AND jsonb_array_length("approval_steps") BETWEEN 1 AND 4
		AND "approval_steps" <@ '["line_manager", "department", "hr", "payroll"]'::jsonb
		AND (
			jsonb_array_length("approval_steps") = 1
			OR (
				jsonb_array_length("approval_steps") = 2
				AND "approval_steps"->>0 <> "approval_steps"->>1
			)
			OR (
				jsonb_array_length("approval_steps") = 3
				AND "approval_steps"->>0 <> "approval_steps"->>1
				AND "approval_steps"->>0 <> "approval_steps"->>2
				AND "approval_steps"->>1 <> "approval_steps"->>2
			)
			OR (
				jsonb_array_length("approval_steps") = 4
				AND "approval_steps"->>0 <> "approval_steps"->>1
				AND "approval_steps"->>0 <> "approval_steps"->>2
				AND "approval_steps"->>0 <> "approval_steps"->>3
				AND "approval_steps"->>1 <> "approval_steps"->>2
				AND "approval_steps"->>1 <> "approval_steps"->>3
				AND "approval_steps"->>2 <> "approval_steps"->>3
			)
		)
	)
);
--> statement-breakpoint
ALTER TABLE "hr_work_calendar"
	ADD COLUMN IF NOT EXISTS "supersedes_calendar_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_calendar"
	DROP CONSTRAINT IF EXISTS "hr_work_calendar_status_check";
--> statement-breakpoint
ALTER TABLE "hr_work_calendar"
	ADD CONSTRAINT "hr_work_calendar_status_check" CHECK ("status" IN ('active', 'superseded', 'archived'));
--> statement-breakpoint
ALTER TABLE "hr_shift"
	ADD COLUMN IF NOT EXISTS "supersedes_shift_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_shift"
	DROP CONSTRAINT IF EXISTS "hr_shift_status_check";
--> statement-breakpoint
ALTER TABLE "hr_shift"
	ADD CONSTRAINT "hr_shift_status_check" CHECK ("status" IN ('draft', 'active', 'superseded', 'inactive'));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_time_policy_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"policy_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_time_policy_assignment_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_time_approval_authority_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"authority" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_time_approval_authority_assignment_authority_check" CHECK ("authority" IN ('line_manager', 'department', 'hr', 'payroll')),
	CONSTRAINT "hr_time_approval_authority_assignment_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_attendance_break_waiver_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"authority_assignment_id" uuid NOT NULL,
	"authority" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"evidence_reference" text NOT NULL,
	"automatic_break_minutes" integer NOT NULL,
	"recorded_break_minutes" integer NOT NULL,
	"session_version" integer NOT NULL,
	"correlation_id" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_attendance_break_waiver_decision_authority_check" CHECK ("authority" IN ('line_manager', 'department', 'hr', 'payroll')),
	CONSTRAINT "hr_attendance_break_waiver_decision_minutes_check" CHECK ("automatic_break_minutes" > 0 AND "recorded_break_minutes" >= 0 AND "recorded_break_minutes" < "automatic_break_minutes"),
	CONSTRAINT "hr_attendance_break_waiver_decision_version_check" CHECK ("session_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "hr_timesheet"
	ADD COLUMN IF NOT EXISTS "submission_reference" uuid;
--> statement-breakpoint
ALTER TABLE "hr_timesheet"
	ADD COLUMN IF NOT EXISTS "approval_policy_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_timesheet"
	ADD COLUMN IF NOT EXISTS "required_approval_steps" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_timesheet"
	ADD COLUMN IF NOT EXISTS "completed_approval_steps" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "hr_timesheet"
SET
	"status" = 'returned',
	"returned_at" = COALESCE("returned_at", now()),
	"approver_notes" = COALESCE(
		"approver_notes",
		'Approval policy snapshot required after Time approval migration.'
	),
	"version" = "version" + 1,
	"updated_at" = now()
WHERE
	"status" = 'submitted'
	AND (
		"submission_reference" IS NULL
		OR jsonb_array_length("required_approval_steps") = 0
	);
--> statement-breakpoint
ALTER TABLE "hr_timesheet"
	DROP CONSTRAINT IF EXISTS "hr_timesheet_approval_progress_check";
--> statement-breakpoint
ALTER TABLE "hr_timesheet"
	ADD CONSTRAINT "hr_timesheet_approval_progress_check" CHECK (
		jsonb_typeof("required_approval_steps") = 'array'
		AND jsonb_array_length("required_approval_steps") <= 4
		AND "required_approval_steps" <@ '["line_manager", "department", "hr", "payroll"]'::jsonb
		AND (
			"status" <> 'submitted'
			OR jsonb_array_length("required_approval_steps") >= 1
		)
		AND (
			jsonb_array_length("required_approval_steps") <= 1
			OR (
				jsonb_array_length("required_approval_steps") = 2
				AND "required_approval_steps"->>0 <> "required_approval_steps"->>1
			)
			OR (
				jsonb_array_length("required_approval_steps") = 3
				AND "required_approval_steps"->>0 <> "required_approval_steps"->>1
				AND "required_approval_steps"->>0 <> "required_approval_steps"->>2
				AND "required_approval_steps"->>1 <> "required_approval_steps"->>2
			)
			OR (
				jsonb_array_length("required_approval_steps") = 4
				AND "required_approval_steps"->>0 <> "required_approval_steps"->>1
				AND "required_approval_steps"->>0 <> "required_approval_steps"->>2
				AND "required_approval_steps"->>0 <> "required_approval_steps"->>3
				AND "required_approval_steps"->>1 <> "required_approval_steps"->>2
				AND "required_approval_steps"->>1 <> "required_approval_steps"->>3
				AND "required_approval_steps"->>2 <> "required_approval_steps"->>3
			)
		)
		AND "completed_approval_steps" >= 0
		AND "completed_approval_steps" <= jsonb_array_length("required_approval_steps")
	);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_timesheet_approval_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"timesheet_id" uuid NOT NULL,
	"submission_reference" uuid NOT NULL,
	"policy_id" uuid,
	"authority_assignment_id" uuid NOT NULL,
	"step_index" integer NOT NULL,
	"authority" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"comment" text,
	"version_approved" integer NOT NULL,
	"correlation_id" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_timesheet_approval_decision_step_check" CHECK ("step_index" >= 0),
	CONSTRAINT "hr_timesheet_approval_decision_authority_check" CHECK ("authority" IN ('line_manager', 'department', 'hr', 'payroll'))
);
--> statement-breakpoint
ALTER TABLE "hr_time_policy_assignment"
	ADD CONSTRAINT "hr_time_policy_assignment_policy_id_hr_time_policy_id_fk"
	FOREIGN KEY ("policy_id") REFERENCES "public"."hr_time_policy"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_work_calendar"
	ADD CONSTRAINT "hr_work_calendar_supersedes_calendar_id_hr_work_calendar_id_fk"
	FOREIGN KEY ("supersedes_calendar_id") REFERENCES "public"."hr_work_calendar"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_shift"
	ADD CONSTRAINT "hr_shift_supersedes_shift_id_hr_shift_id_fk"
	FOREIGN KEY ("supersedes_shift_id") REFERENCES "public"."hr_shift"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_time_policy_assignment"
	ADD CONSTRAINT "hr_time_policy_assignment_employment_id_hr_employment_id_fk"
	FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_time_policy"
	ADD CONSTRAINT "hr_time_policy_supersedes_policy_id_hr_time_policy_id_fk"
	FOREIGN KEY ("supersedes_policy_id") REFERENCES "public"."hr_time_policy"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_timesheet"
	ADD CONSTRAINT "hr_timesheet_approval_policy_id_hr_time_policy_id_fk"
	FOREIGN KEY ("approval_policy_id") REFERENCES "public"."hr_time_policy"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_timesheet_approval_decision"
	ADD CONSTRAINT "hr_timesheet_approval_decision_timesheet_id_hr_timesheet_id_fk"
	FOREIGN KEY ("timesheet_id") REFERENCES "public"."hr_timesheet"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_break_waiver_decision"
	ADD CONSTRAINT "hr_attendance_break_waiver_decision_session_id_hr_attendance_session_id_fk"
	FOREIGN KEY ("session_id") REFERENCES "public"."hr_attendance_session"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_break_waiver_decision"
	ADD CONSTRAINT "hr_attendance_break_waiver_decision_policy_id_hr_time_policy_id_fk"
	FOREIGN KEY ("policy_id") REFERENCES "public"."hr_time_policy"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_attendance_break_waiver_decision"
	ADD CONSTRAINT "hr_attendance_break_waiver_decision_authority_assignment_id_hr_time_approval_authority_assignment_id_fk"
	FOREIGN KEY ("authority_assignment_id") REFERENCES "public"."hr_time_approval_authority_assignment"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_timesheet_approval_decision"
	ADD CONSTRAINT "hr_timesheet_approval_decision_policy_id_hr_time_policy_id_fk"
	FOREIGN KEY ("policy_id") REFERENCES "public"."hr_time_policy"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_timesheet_approval_decision"
	ADD CONSTRAINT "hr_timesheet_approval_decision_authority_assignment_id_hr_time_approval_authority_assignment_id_fk"
	FOREIGN KEY ("authority_assignment_id") REFERENCES "public"."hr_time_approval_authority_assignment"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_time_policy_org_id_idx"
	ON "hr_time_policy" USING btree ("organization_id", "id");
--> statement-breakpoint
DROP INDEX IF EXISTS "hr_work_calendar_org_code_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_work_calendar_org_code_from_uidx"
	ON "hr_work_calendar" USING btree ("organization_id", "code", "effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_time_policy_org_code_from_uidx"
	ON "hr_time_policy" USING btree ("organization_id", "code", "effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_time_policy_org_create_idem_uidx"
	ON "hr_time_policy" USING btree ("organization_id", "create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_time_policy_assignment_org_id_idx"
	ON "hr_time_policy_assignment" USING btree ("organization_id", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_time_policy_assignment_org_employment_idx"
	ON "hr_time_policy_assignment" USING btree ("organization_id", "employment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_time_policy_assignment_org_employment_from_uidx"
	ON "hr_time_policy_assignment" USING btree ("organization_id", "employment_id", "effective_from");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_time_approval_authority_assignment_org_id_idx"
	ON "hr_time_approval_authority_assignment" USING btree ("organization_id", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_time_approval_authority_assignment_org_actor_idx"
	ON "hr_time_approval_authority_assignment" USING btree ("organization_id", "actor_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_time_approval_authority_assignment_org_actor_authority_from_uidx"
	ON "hr_time_approval_authority_assignment" USING btree ("organization_id", "actor_user_id", "authority", "effective_from");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_break_waiver_decision_org_id_idx"
	ON "hr_attendance_break_waiver_decision" USING btree ("organization_id", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_break_waiver_decision_org_session_idx"
	ON "hr_attendance_break_waiver_decision" USING btree ("organization_id", "session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_attendance_break_waiver_decision_org_session_version_uidx"
	ON "hr_attendance_break_waiver_decision" USING btree ("organization_id", "session_id", "session_version");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_timesheet_org_submission_reference_uidx"
	ON "hr_timesheet" USING btree ("organization_id", "submission_reference")
	WHERE "submission_reference" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_timesheet_approval_decision_org_id_idx"
	ON "hr_timesheet_approval_decision" USING btree ("organization_id", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_timesheet_approval_decision_org_timesheet_idx"
	ON "hr_timesheet_approval_decision" USING btree ("organization_id", "timesheet_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_timesheet_approval_decision_org_submission_step_uidx"
	ON "hr_timesheet_approval_decision" USING btree ("organization_id", "submission_reference", "step_index");
--> statement-breakpoint
ALTER TABLE "hr_attendance_adjustment"
	ADD COLUMN IF NOT EXISTS "sequence" integer,
	ADD COLUMN IF NOT EXISTS "event_version_before" integer,
	ADD COLUMN IF NOT EXISTS "event_version_after" integer,
	ADD COLUMN IF NOT EXISTS "previous_notes" text,
	ADD COLUMN IF NOT EXISTS "new_notes" text,
	ADD COLUMN IF NOT EXISTS "evidence_reference" text,
	ADD COLUMN IF NOT EXISTS "correlation_id" text;
--> statement-breakpoint
ALTER TABLE "hr_attendance_event"
	ADD COLUMN IF NOT EXISTS "captured_occurred_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "captured_notes" text;
--> statement-breakpoint
UPDATE "hr_attendance_event" AS event
SET
	"captured_occurred_at" = COALESCE(
		(
			SELECT adjustment."previous_occurred_at"
			FROM "hr_attendance_adjustment" AS adjustment
			WHERE adjustment."organization_id" = event."organization_id"
				AND adjustment."event_id" = event."id"
			ORDER BY adjustment."created_at", adjustment."id"
			LIMIT 1
		),
		event."occurred_at"
	),
	"captured_notes" = CASE
		WHEN EXISTS (
			SELECT 1
			FROM "hr_attendance_adjustment" AS adjustment
			WHERE adjustment."organization_id" = event."organization_id"
				AND adjustment."event_id" = event."id"
		) THEN NULL
		ELSE event."notes"
	END
WHERE event."captured_occurred_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_attendance_adjustment_org_event_sequence_uq"
	ON "hr_attendance_adjustment" USING btree ("organization_id", "event_id", "sequence")
	WHERE "sequence" IS NOT NULL;
