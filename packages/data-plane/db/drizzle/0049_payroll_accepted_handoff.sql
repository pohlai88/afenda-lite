CREATE TABLE "payroll_accepted_handoff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"employment_id" text NOT NULL,
	"contract_version" text NOT NULL,
	"effective_date" date NOT NULL,
	"period_start" date,
	"period_end" date,
	"payload" jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"status" text DEFAULT 'accepted' NOT NULL,
	"superseded_by_handoff_id" uuid,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_accepted_handoff_status_check" CHECK ("status" IN ('accepted', 'superseded')),
	CONSTRAINT "payroll_accepted_handoff_supersession_check" CHECK (("status" = 'superseded' AND "superseded_by_handoff_id" IS NOT NULL) OR ("status" = 'accepted' AND "superseded_by_handoff_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX "payroll_accepted_handoff_org_id_idx" ON "payroll_accepted_handoff" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_accepted_handoff_org_employee_idx" ON "payroll_accepted_handoff" ("organization_id","employee_id","effective_date");
--> statement-breakpoint
ALTER TABLE "payroll_accepted_handoff" ADD CONSTRAINT "payroll_accepted_handoff_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_accepted_handoff_org_create_idempotency_uidx" ON "payroll_accepted_handoff" ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_accepted_handoff_org_active_identity_uidx" ON "payroll_accepted_handoff" ("organization_id","employee_id","effective_date","period_start","period_end") NULLS NOT DISTINCT WHERE "status" = 'accepted';
