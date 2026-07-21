CREATE TABLE "hr_employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_number" text NOT NULL,
	"normalized_employee_number" text NOT NULL,
	"legal_name" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_employee_org_id_idx" ON "hr_employee" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_org_normalized_number_uidx" ON "hr_employee" USING btree ("organization_id","normalized_employee_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_org_create_idempotency_uidx" ON "hr_employee" USING btree ("organization_id","create_idempotency_key");
