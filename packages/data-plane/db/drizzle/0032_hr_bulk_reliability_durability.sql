CREATE TABLE IF NOT EXISTS "hr_bulk_import_checkpoint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"next_row_index" integer NOT NULL,
	"version" integer NOT NULL,
	"rows" jsonb NOT NULL,
	"retryable_failure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_bulk_import_checkpoint_entity_check" CHECK ("entity_type" IN ('employee', 'assignment', 'leave_entitlement', 'attendance', 'compensation', 'learning_assignment')),
	CONSTRAINT "hr_bulk_import_checkpoint_status_check" CHECK ("status" IN ('checkpointed', 'completed', 'completed_with_rejections', 'retryable_failed')),
	CONSTRAINT "hr_bulk_import_checkpoint_version_check" CHECK ("version" > 0 AND "next_row_index" >= 0),
	CONSTRAINT "hr_bulk_import_checkpoint_hash_check" CHECK (length("request_fingerprint") = 64)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_bulk_import_checkpoint_org_idempotency_uidx" ON "hr_bulk_import_checkpoint" USING btree ("organization_id", "idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_bulk_import_checkpoint_org_batch_uidx" ON "hr_bulk_import_checkpoint" USING btree ("organization_id", "batch_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_bulk_import_checkpoint_org_id_uidx" ON "hr_bulk_import_checkpoint" USING btree ("organization_id", "id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_bulk_import_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"checkpoint_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"event" text NOT NULL,
	"row_index" integer,
	"checkpoint_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_bulk_import_audit_checkpoint_fk" FOREIGN KEY ("organization_id", "checkpoint_id") REFERENCES "public"."hr_bulk_import_checkpoint"("organization_id", "id"),
	CONSTRAINT "hr_bulk_import_audit_event_check" CHECK ("event" IN ('BATCH_STARTED', 'ROW_ACCEPTED', 'ROW_REJECTED', 'BATCH_CHECKPOINTED', 'BATCH_COMPLETED', 'BATCH_RETRYABLE_FAILED')),
	CONSTRAINT "hr_bulk_import_audit_sequence_check" CHECK ("sequence" > 0 AND "checkpoint_version" > 0 AND ("row_index" IS NULL OR "row_index" >= 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_bulk_import_audit_org_checkpoint_sequence_uidx" ON "hr_bulk_import_audit" USING btree ("organization_id", "checkpoint_id", "sequence");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_bulk_import_audit_org_created_idx" ON "hr_bulk_import_audit" USING btree ("organization_id", "created_at", "id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_bulk_import_error_artifact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"checkpoint_id" uuid NOT NULL,
	"checkpoint_version" integer NOT NULL,
	"content_type" text DEFAULT 'text/csv' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_bulk_import_error_artifact_checkpoint_fk" FOREIGN KEY ("organization_id", "checkpoint_id") REFERENCES "public"."hr_bulk_import_checkpoint"("organization_id", "id"),
	CONSTRAINT "hr_bulk_import_error_artifact_version_check" CHECK ("checkpoint_version" > 0),
	CONSTRAINT "hr_bulk_import_error_artifact_content_check" CHECK ("content_type" = 'text/csv' AND length("content") > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_bulk_import_error_artifact_org_checkpoint_version_uidx" ON "hr_bulk_import_error_artifact" USING btree ("organization_id", "checkpoint_id", "checkpoint_version");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_reliability_work_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"connector" text NOT NULL,
	"operation" text NOT NULL,
	"correlation_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"version" integer NOT NULL,
	"attempt_count" integer NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_error_code" text,
	"last_error_message" text,
	"receipt_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "hr_reliability_work_item_status_check" CHECK ("status" IN ('pending', 'succeeded', 'dead_lettered')),
	CONSTRAINT "hr_reliability_work_item_version_check" CHECK ("version" > 0 AND "attempt_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_reliability_work_item_org_connector_idempotency_uidx" ON "hr_reliability_work_item" USING btree ("organization_id", "connector", "idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_reliability_work_item_org_id_uidx" ON "hr_reliability_work_item" USING btree ("organization_id", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_reliability_work_item_org_status_due_idx" ON "hr_reliability_work_item" USING btree ("organization_id", "status", "next_attempt_at", "id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_reliability_dead_letter" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"work_item_id" uuid NOT NULL,
	"connector" text NOT NULL,
	"operation" text NOT NULL,
	"correlation_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"attempt_count" integer NOT NULL,
	"error_code" text NOT NULL,
	"error_message" text NOT NULL,
	"failed_at" timestamp with time zone NOT NULL,
	"replayed_by_work_item_id" uuid,
	CONSTRAINT "hr_reliability_dead_letter_work_item_fk" FOREIGN KEY ("organization_id", "work_item_id") REFERENCES "public"."hr_reliability_work_item"("organization_id", "id"),
	CONSTRAINT "hr_reliability_dead_letter_replay_fk" FOREIGN KEY ("organization_id", "replayed_by_work_item_id") REFERENCES "public"."hr_reliability_work_item"("organization_id", "id"),
	CONSTRAINT "hr_reliability_dead_letter_attempt_check" CHECK ("attempt_count" > 0),
	CONSTRAINT "hr_reliability_dead_letter_lineage_check" CHECK ("replayed_by_work_item_id" IS NULL OR "replayed_by_work_item_id" <> "work_item_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_reliability_dead_letter_org_work_item_uidx" ON "hr_reliability_dead_letter" USING btree ("organization_id", "work_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_reliability_dead_letter_org_failed_idx" ON "hr_reliability_dead_letter" USING btree ("organization_id", "failed_at", "id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_connector_cursor" (
	"organization_id" text NOT NULL,
	"connector" text NOT NULL,
	"stream" text NOT NULL,
	"cursor" text,
	"version" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "hr_connector_cursor_pk" PRIMARY KEY ("organization_id", "connector", "stream"),
	CONSTRAINT "hr_connector_cursor_version_check" CHECK ("version" > 0)
);
