CREATE TABLE "hr_person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
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
CREATE TABLE "hr_worker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" uuid NOT NULL,
	"worker_type" text NOT NULL,
	"employee_id" uuid,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_worker_type_check" CHECK ("worker_type" IN ('employee', 'contractor', 'contingent_worker', 'intern')),
	CONSTRAINT "hr_worker_status_check" CHECK ("status" IN ('active', 'inactive', 'former')),
	CONSTRAINT "hr_worker_effective_dates_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
	CONSTRAINT "hr_worker_employee_id_check" CHECK (("worker_type" = 'employee') OR ("employee_id" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_org_id_uidx" ON "hr_person" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_org_id_uidx" ON "hr_employee" USING btree ("organization_id","id");
--> statement-breakpoint
ALTER TABLE "hr_worker" ADD CONSTRAINT "hr_worker_org_person_fk" FOREIGN KEY ("organization_id","person_id") REFERENCES "public"."hr_person"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_worker" ADD CONSTRAINT "hr_worker_org_employee_fk" FOREIGN KEY ("organization_id","employee_id") REFERENCES "public"."hr_employee"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_person_org_id_idx" ON "hr_person" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_person_org_legal_name_idx" ON "hr_person" USING btree ("organization_id","legal_name");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_org_create_idempotency_uidx" ON "hr_person" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX "hr_worker_org_id_idx" ON "hr_worker" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_worker_org_person_idx" ON "hr_worker" USING btree ("organization_id","person_id");
--> statement-breakpoint
CREATE INDEX "hr_worker_org_employee_idx" ON "hr_worker" USING btree ("organization_id","employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_worker_org_create_idempotency_uidx" ON "hr_worker" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_worker_org_id_uidx" ON "hr_worker" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_worker_org_person_uidx" ON "hr_worker" USING btree ("organization_id","person_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_worker_org_employee_uidx" ON "hr_worker" USING btree ("organization_id","employee_id") WHERE "employee_id" IS NOT NULL;
