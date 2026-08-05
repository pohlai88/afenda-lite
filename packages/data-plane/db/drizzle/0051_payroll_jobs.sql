CREATE TABLE "payroll_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"target_run_id" uuid NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"checkpoint_json" jsonb NOT NULL,
	"last_error_code" text,
	"last_error_message" text,
	"completed_at" timestamp with time zone,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_job_kind_check" CHECK ("kind" IN ('calculate-run')),
	CONSTRAINT "payroll_job_status_check" CHECK ("status" IN ('queued', 'running', 'completed', 'failed', 'dead_lettered'))
);
--> statement-breakpoint
CREATE TABLE "payroll_job_work_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"status" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"last_error_code" text,
	"last_error_message" text,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_job_work_item_status_check" CHECK ("status" IN ('pending', 'processing', 'succeeded', 'dead_lettered'))
);
--> statement-breakpoint
CREATE TABLE "payroll_job_dead_letter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"work_item_id" uuid NOT NULL,
	"error_code" text NOT NULL,
	"error_message" text NOT NULL,
	"attempt_count" integer NOT NULL,
	"failed_at" timestamp with time zone NOT NULL,
	"replayed_by_work_item_id" uuid
);
--> statement-breakpoint
CREATE INDEX "payroll_job_org_id_idx" ON "payroll_job" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_job_org_status_idx" ON "payroll_job" ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "payroll_job_org_run_idx" ON "payroll_job" ("organization_id","target_run_id");
--> statement-breakpoint
ALTER TABLE "payroll_job" ADD CONSTRAINT "payroll_job_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_job_org_create_idempotency_uidx" ON "payroll_job" ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX "payroll_job_work_item_org_id_idx" ON "payroll_job_work_item" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_job_work_item_org_job_idx" ON "payroll_job_work_item" ("organization_id","job_id");
--> statement-breakpoint
CREATE INDEX "payroll_job_work_item_org_due_idx" ON "payroll_job_work_item" ("organization_id","status","next_attempt_at");
--> statement-breakpoint
ALTER TABLE "payroll_job_work_item" ADD CONSTRAINT "payroll_job_work_item_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_job_work_item_org_idempotency_uidx" ON "payroll_job_work_item" ("organization_id","idempotency_key");
--> statement-breakpoint
ALTER TABLE "payroll_job_work_item" ADD CONSTRAINT "payroll_job_work_item_org_job_fk" FOREIGN KEY ("organization_id","job_id") REFERENCES "payroll_job"("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_job_dead_letter_org_id_idx" ON "payroll_job_dead_letter" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_job_dead_letter_org_job_idx" ON "payroll_job_dead_letter" ("organization_id","job_id");
--> statement-breakpoint
ALTER TABLE "payroll_job_dead_letter" ADD CONSTRAINT "payroll_job_dead_letter_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
ALTER TABLE "payroll_job_dead_letter" ADD CONSTRAINT "payroll_job_dead_letter_org_job_fk" FOREIGN KEY ("organization_id","job_id") REFERENCES "payroll_job"("organization_id","id");
