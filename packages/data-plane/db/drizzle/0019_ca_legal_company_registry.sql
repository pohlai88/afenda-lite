CREATE TABLE IF NOT EXISTS "ca_legal_company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"legal_entity_dimension_id" uuid NOT NULL,
	"legal_entity_key_snapshot" text NOT NULL,
	"legal_entity_name_snapshot" text NOT NULL,
	"legal_party_id" uuid,
	"legal_party_code_snapshot" text,
	"legal_party_name_snapshot" text,
	"jurisdiction_country_id" uuid,
	"legal_form_code" text,
	"legal_form_name_snapshot" text,
	"incorporation_date" date,
	"commencement_date" date,
	"fiscal_year_end_month" integer,
	"fiscal_year_end_day" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"activated_at" timestamp with time zone,
	"activated_by" text,
	"suspended_at" timestamp with time zone,
	"suspended_by" text,
	"dissolved_at" timestamp with time zone,
	"dissolved_by" text,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_company_name" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"name_type" text NOT NULL,
	"display_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_id" uuid,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_company_identifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"identifier_type" text NOT NULL,
	"jurisdiction_code" text,
	"issuing_authority" text,
	"identifier_value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_company_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"effective_date" date NOT NULL,
	"reason" text,
	"evidence_reference" text,
	"correlation_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_legal_entity_dimension_id_md_organization_dimension_id_fk" FOREIGN KEY ("legal_entity_dimension_id") REFERENCES "public"."md_organization_dimension"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_legal_party_id_md_party_id_fk" FOREIGN KEY ("legal_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" ADD CONSTRAINT "ca_company_status_history_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_legal_company_org_id_idx" ON "ca_legal_company" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_legal_company_org_status_idx" ON "ca_legal_company" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_legal_company_org_normalized_code_uidx" ON "ca_legal_company" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_legal_company_org_create_idempotency_uidx" ON "ca_legal_company" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_legal_company_org_legal_entity_uidx" ON "ca_legal_company" USING btree ("organization_id","legal_entity_dimension_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_name_org_company_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_name_org_company_type_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","name_type");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_name_org_idempotency_uidx" ON "ca_company_name" USING btree ("organization_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_identifier_org_company_idx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_identifier_org_type_value_uidx" ON "ca_company_identifier" USING btree ("organization_id","identifier_type","normalized_value");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_identifier_org_idempotency_uidx" ON "ca_company_identifier" USING btree ("organization_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_status_history_org_company_idx" ON "ca_company_status_history" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_status_history_org_idempotency_uidx" ON "ca_company_status_history" USING btree ("organization_id","idempotency_key");
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_status_check" CHECK ("status" IN ('draft', 'active', 'suspended', 'dissolved', 'archived'));
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_type_check" CHECK ("name_type" IN ('legal', 'former', 'trading'));
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_effective_dates_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_status_check" CHECK ("status" IN ('active', 'retired'));
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_effective_dates_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
