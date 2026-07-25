CREATE TABLE IF NOT EXISTS "ca_corporate_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"document_class" text NOT NULL,
	"title" text NOT NULL,
	"external_object_reference" text NOT NULL,
	"checksum_sha256" text,
	"version_number" integer DEFAULT 1 NOT NULL,
	"classification" text DEFAULT 'internal' NOT NULL,
	"supersedes_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_filing_obligation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"obligation_code" text NOT NULL,
	"normalized_obligation_code" text NOT NULL,
	"authority_reference" text,
	"period_label" text NOT NULL,
	"due_date" date NOT NULL,
	"extended_due_date" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_filing_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"filing_obligation_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"submission_reference" text,
	"acknowledgement_reference" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"correlation_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ca_corporate_document" ADD CONSTRAINT "ca_corporate_document_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_filing_obligation" ADD CONSTRAINT "ca_filing_obligation_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_filing_submission" ADD CONSTRAINT "ca_filing_submission_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_filing_submission" ADD CONSTRAINT "ca_filing_submission_filing_obligation_id_ca_filing_obligation_id_fk" FOREIGN KEY ("filing_obligation_id") REFERENCES "public"."ca_filing_obligation"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_corporate_document_org_company_idx" ON "ca_corporate_document" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_corporate_document_org_class_idx" ON "ca_corporate_document" USING btree ("organization_id","document_class");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_corporate_document_org_idempotency_uidx" ON "ca_corporate_document" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_filing_obligation_org_company_idx" ON "ca_filing_obligation" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_filing_obligation_org_due_idx" ON "ca_filing_obligation" USING btree ("organization_id","due_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_filing_obligation_org_status_due_idx" ON "ca_filing_obligation" USING btree ("organization_id","status","due_date");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_filing_obligation_org_period_uidx" ON "ca_filing_obligation" USING btree ("organization_id","legal_company_id","normalized_obligation_code","period_label");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_filing_obligation_org_idempotency_uidx" ON "ca_filing_obligation" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_filing_submission_org_obligation_idx" ON "ca_filing_submission" USING btree ("organization_id","filing_obligation_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_filing_submission_org_idempotency_uidx" ON "ca_filing_submission" USING btree ("organization_id","create_idempotency_key");
