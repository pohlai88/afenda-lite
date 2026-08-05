CREATE TABLE "payroll_statutory_filing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"instrument_code" text NOT NULL,
	"period_id" uuid,
	"tax_year" integer NOT NULL,
	"employee_id" text,
	"status" text NOT NULL,
	"source_run_ids_json" jsonb NOT NULL,
	"totals_json" jsonb NOT NULL,
	"evidence_json" jsonb,
	"sealed_by" text,
	"sealed_at" timestamp with time zone,
	"correlation_id" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_statutory_filing_kind_check" CHECK ("kind" IN ('period_filing', 'annual_statement')),
	CONSTRAINT "payroll_statutory_filing_status_check" CHECK ("status" IN ('generated', 'sealed')),
	CONSTRAINT "payroll_statutory_filing_period_shape_check" CHECK (("kind" <> 'period_filing') OR ("period_id" IS NOT NULL AND "employee_id" IS NULL)),
	CONSTRAINT "payroll_statutory_filing_annual_shape_check" CHECK (("kind" <> 'annual_statement') OR ("employee_id" IS NOT NULL AND "period_id" IS NULL)),
	CONSTRAINT "payroll_statutory_filing_sealed_shape_check" CHECK (("status" <> 'sealed') OR ("evidence_json" IS NOT NULL AND "sealed_by" IS NOT NULL AND "sealed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "payroll_statutory_filing_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"filing_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"rule_code" text NOT NULL,
	"rule_version" text NOT NULL,
	"calculator_id" text NOT NULL,
	"base_amount" numeric(24, 12) NOT NULL,
	"employee_amount" numeric(24, 12) NOT NULL,
	"employer_amount" numeric(24, 12) NOT NULL,
	"currency_code" text NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "payroll_statutory_filing_org_id_idx" ON "payroll_statutory_filing" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_statutory_filing_org_status_idx" ON "payroll_statutory_filing" ("organization_id","status");
--> statement-breakpoint
ALTER TABLE "payroll_statutory_filing" ADD CONSTRAINT "payroll_statutory_filing_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_statutory_filing_org_create_idempotency_uidx" ON "payroll_statutory_filing" ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_statutory_filing_org_period_natural_uidx" ON "payroll_statutory_filing" ("organization_id","jurisdiction_code","instrument_code","period_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_statutory_filing_org_annual_natural_uidx" ON "payroll_statutory_filing" ("organization_id","jurisdiction_code","instrument_code","tax_year","employee_id");
--> statement-breakpoint
CREATE INDEX "payroll_statutory_filing_line_org_id_idx" ON "payroll_statutory_filing_line" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_statutory_filing_line_org_filing_idx" ON "payroll_statutory_filing_line" ("organization_id","filing_id");
--> statement-breakpoint
ALTER TABLE "payroll_statutory_filing_line" ADD CONSTRAINT "payroll_statutory_filing_line_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_statutory_filing_line_org_filing_sequence_uidx" ON "payroll_statutory_filing_line" ("organization_id","filing_id","sequence");
--> statement-breakpoint
ALTER TABLE "payroll_statutory_filing_line" ADD CONSTRAINT "payroll_statutory_filing_line_org_filing_fk" FOREIGN KEY ("organization_id","filing_id") REFERENCES "payroll_statutory_filing"("organization_id","id");
