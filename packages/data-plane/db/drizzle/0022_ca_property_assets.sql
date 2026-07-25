CREATE TABLE IF NOT EXISTS "ca_property_holding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"title_reference" text NOT NULL,
	"normalized_title_reference" text NOT NULL,
	"property_description" text NOT NULL,
	"ownership_percentage" numeric(8, 4) NOT NULL,
	"tenure_type" text,
	"acquisition_date" date,
	"disposal_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_corporate_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"category" text NOT NULL,
	"asset_identifier" text,
	"custodian_party_id" uuid,
	"custodian_party_code_snapshot" text,
	"custodian_party_name_snapshot" text,
	"acquisition_date" date,
	"disposal_date" date,
	"write_off_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_intellectual_property_right" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"right_type" text NOT NULL,
	"jurisdiction_code" text,
	"registration_number" text NOT NULL,
	"normalized_registration_number" text NOT NULL,
	"owner_party_id" uuid,
	"owner_party_code_snapshot" text,
	"owner_party_name_snapshot" text,
	"filing_date" date,
	"grant_date" date,
	"expiry_date" date,
	"renewal_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_insurance_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"insurer_party_id" uuid,
	"insurer_party_code_snapshot" text,
	"insurer_party_name_snapshot" text,
	"policy_number" text NOT NULL,
	"normalized_policy_number" text NOT NULL,
	"covered_subject" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"limit_amount" numeric(24, 2),
	"currency_code" text,
	"status" text DEFAULT 'active' NOT NULL,
	"document_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_charge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"secured_party_id" uuid,
	"secured_party_code_snapshot" text,
	"secured_party_name_snapshot" text,
	"affected_subject_reference" text NOT NULL,
	"amount" numeric(24, 2),
	"currency_code" text,
	"priority_rank" integer,
	"created_date" date NOT NULL,
	"released_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"evidence_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ca_property_holding" ADD CONSTRAINT "ca_property_holding_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_corporate_asset" ADD CONSTRAINT "ca_corporate_asset_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_intellectual_property_right" ADD CONSTRAINT "ca_intellectual_property_right_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_insurance_policy" ADD CONSTRAINT "ca_insurance_policy_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_charge" ADD CONSTRAINT "ca_charge_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_property_holding_org_company_idx" ON "ca_property_holding" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_property_holding_org_code_uidx" ON "ca_property_holding" USING btree ("organization_id","legal_company_id","normalized_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_property_holding_org_idempotency_uidx" ON "ca_property_holding" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_corporate_asset_org_company_idx" ON "ca_corporate_asset" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_corporate_asset_org_code_uidx" ON "ca_corporate_asset" USING btree ("organization_id","legal_company_id","normalized_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_corporate_asset_org_idempotency_uidx" ON "ca_corporate_asset" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_intellectual_property_right_org_company_idx" ON "ca_intellectual_property_right" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_intellectual_property_right_org_number_uidx" ON "ca_intellectual_property_right" USING btree ("organization_id","legal_company_id","normalized_registration_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_intellectual_property_right_org_idempotency_uidx" ON "ca_intellectual_property_right" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_insurance_policy_org_company_idx" ON "ca_insurance_policy" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_insurance_policy_org_number_uidx" ON "ca_insurance_policy" USING btree ("organization_id","legal_company_id","normalized_policy_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_insurance_policy_org_idempotency_uidx" ON "ca_insurance_policy" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_charge_org_company_idx" ON "ca_charge" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_charge_org_idempotency_uidx" ON "ca_charge" USING btree ("organization_id","create_idempotency_key");
