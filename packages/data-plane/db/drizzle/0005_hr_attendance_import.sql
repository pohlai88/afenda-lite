CREATE TABLE IF NOT EXISTS "hr_attendance_import_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"source_key" text NOT NULL,
	"status" text NOT NULL,
	"accepted_count" integer NOT NULL DEFAULT 0,
	"skipped_count" integer NOT NULL DEFAULT 0,
	"rejected_count" integer NOT NULL DEFAULT 0,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"result_snapshot" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "hr_attendance_import_batch_status_check" CHECK ("status" IN ('completed', 'partial', 'failed'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_attendance_import_error" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"import_batch_id" uuid NOT NULL,
	"row_index" integer NOT NULL,
	"source_reference" text,
	"error_code" text NOT NULL,
	"error_message" text NOT NULL,
	"payload_checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conrelid = 'public.hr_attendance_import_error'::regclass
			AND conname = LEFT(
				'hr_attendance_import_error_import_batch_id_hr_attendance_import_batch_id_fk',
				current_setting('max_identifier_length')::integer
			)
	) THEN
		ALTER TABLE "hr_attendance_import_error"
			ADD CONSTRAINT "hr_attendance_import_error_import_batch_id_hr_attendance_import_batch_id_fk"
			FOREIGN KEY ("import_batch_id")
			REFERENCES "public"."hr_attendance_import_batch"("id")
			ON DELETE no action
			ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_attendance_import_batch_org_create_idempotency_uidx" ON "hr_attendance_import_batch" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_import_batch_org_id_idx" ON "hr_attendance_import_batch" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_import_batch_org_batch_idx" ON "hr_attendance_import_batch" USING btree ("organization_id","batch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_attendance_import_error_org_batch_idx" ON "hr_attendance_import_error" USING btree ("organization_id","import_batch_id");
