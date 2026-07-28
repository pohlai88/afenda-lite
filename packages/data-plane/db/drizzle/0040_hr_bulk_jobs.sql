CREATE TABLE IF NOT EXISTS "hr_bulk_import_job" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"required_permission" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"row_count" integer NOT NULL,
	"max_rows_per_run" integer NOT NULL,
	"checkpoint_version" integer,
	"last_error_code" text,
	"last_error_message" text,
	"payload_purge_at" timestamp with time zone,
	"payload_purged_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "hr_bulk_import_job_org_id_uidx" UNIQUE("organization_id", "id"),
	CONSTRAINT "hr_bulk_import_job_entity_check" CHECK ("entity_type" IN ('employee', 'assignment', 'leave_entitlement', 'attendance', 'compensation', 'learning_assignment')),
	CONSTRAINT "hr_bulk_import_job_status_check" CHECK ("status" IN ('queued', 'running', 'completed', 'completed_with_rejections', 'failed')),
	CONSTRAINT "hr_bulk_import_job_bounds_check" CHECK ("version" > 0 AND "row_count" BETWEEN 1 AND 500 AND "max_rows_per_run" BETWEEN 1 AND 500),
	CONSTRAINT "hr_bulk_import_job_hash_check" CHECK (length("request_fingerprint") = 64)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_bulk_import_job_org_idempotency_uidx" ON "hr_bulk_import_job" ("organization_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_bulk_import_job_org_status_updated_idx" ON "hr_bulk_import_job" ("organization_id", "status", "updated_at", "id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_bulk_import_job_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"row_index" integer NOT NULL,
	"source_reference" text NOT NULL,
	"payload" jsonb,
	"payload_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "hr_bulk_import_job_row_job_fk" FOREIGN KEY ("organization_id", "job_id") REFERENCES "hr_bulk_import_job"("organization_id", "id") ON DELETE CASCADE,
	CONSTRAINT "hr_bulk_import_job_row_bounds_check" CHECK ("row_index" >= 0 AND length("payload_hash") = 64 AND char_length(btrim("source_reference")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_bulk_import_job_row_org_job_index_uidx" ON "hr_bulk_import_job_row" ("organization_id", "job_id", "row_index");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_bulk_import_job_row_org_job_source_uidx" ON "hr_bulk_import_job_row" ("organization_id", "job_id", "source_reference");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_bulk_export_job" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"required_permission" text NOT NULL,
	"export_type" text NOT NULL,
	"requested_fields" jsonb NOT NULL,
	"date_from" date,
	"date_to" date,
	"effective_on" date,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"next_page" integer DEFAULT 1 NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"privacy_evidence_id" text,
	"artifact_sha256" text,
	"artifact_byte_count" integer,
	"artifact_expires_at" timestamp with time zone,
	"artifact_purged_at" timestamp with time zone,
	"last_error_code" text,
	"last_error_message" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "hr_bulk_export_job_org_id_uidx" UNIQUE("organization_id", "id"),
	CONSTRAINT "hr_bulk_export_job_type_check" CHECK ("export_type" IN ('employee', 'assignment', 'leave_entitlement', 'attendance', 'compensation', 'learning_assignment')),
	CONSTRAINT "hr_bulk_export_job_status_check" CHECK ("status" IN ('queued', 'running', 'completed', 'completed_with_rejections', 'failed')),
	CONSTRAINT "hr_bulk_export_job_bounds_check" CHECK ("version" > 0 AND "next_page" > 0 AND "row_count" BETWEEN 0 AND 5000),
	CONSTRAINT "hr_bulk_export_job_hash_check" CHECK (length("request_fingerprint") = 64 AND ("artifact_sha256" IS NULL OR length("artifact_sha256") = 64))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_bulk_export_job_org_idempotency_uidx" ON "hr_bulk_export_job" ("organization_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_bulk_export_job_org_status_updated_idx" ON "hr_bulk_export_job" ("organization_id", "status", "updated_at", "id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_bulk_export_artifact_chunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"content_sha256" text NOT NULL,
	"byte_count" integer NOT NULL,
	"row_count" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "hr_bulk_export_artifact_chunk_job_fk" FOREIGN KEY ("organization_id", "job_id") REFERENCES "hr_bulk_export_job"("organization_id", "id") ON DELETE CASCADE,
	CONSTRAINT "hr_bulk_export_artifact_chunk_content_check" CHECK ("chunk_index" >= 0 AND "byte_count" > 0 AND "row_count" >= 0 AND length("content_sha256") = 64 AND length("content") > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_bulk_export_artifact_chunk_org_job_index_uidx" ON "hr_bulk_export_artifact_chunk" ("organization_id", "job_id", "chunk_index");
