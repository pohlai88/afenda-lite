CREATE TABLE IF NOT EXISTS "hr_payroll_handoff_delivery" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"payload_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_error" text,
	"delivered_at" timestamp with time zone,
	"producer_receipt_id" text,
	"feedback_at" timestamp with time zone,
	"feedback_by" text,
	"feedback_reason" text,
	"supersedes_delivery_id" uuid,
	"superseded_by_delivery_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_payroll_handoff_delivery_status_check" CHECK ("status" IN ('pending', 'delivered', 'acknowledged', 'rejected', 'correction_required', 'failed')),
	CONSTRAINT "hr_payroll_handoff_delivery_version_check" CHECK ("version" > 0),
	CONSTRAINT "hr_payroll_handoff_delivery_attempt_check" CHECK ("attempt_count" >= 0 AND "max_attempts" > 0 AND "attempt_count" <= "max_attempts"),
	CONSTRAINT "hr_payroll_handoff_delivery_hash_check" CHECK (length("payload_hash") = 64 AND length("request_fingerprint") = 64),
	CONSTRAINT "hr_payroll_handoff_delivery_lineage_check" CHECK ("supersedes_delivery_id" IS NULL OR "supersedes_delivery_id" <> "id"),
	CONSTRAINT "hr_payroll_handoff_delivery_supersedes_fk" FOREIGN KEY ("supersedes_delivery_id") REFERENCES "public"."hr_payroll_handoff_delivery"("id"),
	CONSTRAINT "hr_payroll_handoff_delivery_superseded_by_fk" FOREIGN KEY ("superseded_by_delivery_id") REFERENCES "public"."hr_payroll_handoff_delivery"("id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_payroll_handoff_delivery_org_idempotency_uidx" ON "hr_payroll_handoff_delivery" USING btree ("organization_id", "idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_payroll_handoff_delivery_org_supersedes_uidx" ON "hr_payroll_handoff_delivery" USING btree ("organization_id", "supersedes_delivery_id") WHERE "supersedes_delivery_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_payroll_handoff_delivery_org_status_created_idx" ON "hr_payroll_handoff_delivery" USING btree ("organization_id", "status", "created_at", "id");
