CREATE TABLE IF NOT EXISTS "ca_licence_permit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"authority_party_id" uuid,
	"authority_party_code_snapshot" text,
	"authority_party_name_snapshot" text,
	"jurisdiction_code" text,
	"licence_number" text NOT NULL,
	"normalized_licence_number" text NOT NULL,
	"scope_description" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
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
CREATE TABLE IF NOT EXISTS "ca_bank_account_registration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"bank_party_id" uuid,
	"bank_party_code_snapshot" text,
	"bank_party_name_snapshot" text,
	"masked_account_identity" text NOT NULL,
	"account_token" text,
	"country_code" text,
	"currency_code" text NOT NULL,
	"purpose" text,
	"opened_date" date,
	"closed_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_bank_mandate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"bank_account_registration_id" uuid NOT NULL,
	"authority_mandate_id" uuid,
	"signatory_party_id" uuid NOT NULL,
	"signatory_party_code_snapshot" text,
	"signatory_party_name_snapshot" text,
	"signing_rule" text DEFAULT 'single' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_group_control_relationship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"related_legal_company_id" uuid,
	"related_party_id" uuid,
	"related_party_code_snapshot" text,
	"related_party_name_snapshot" text,
	"relationship_type" text NOT NULL,
	"control_percentage" numeric(8, 4),
	"control_basis" text,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_material_agreement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"agreement_type" text NOT NULL,
	"counterparty_party_id" uuid,
	"counterparty_party_code_snapshot" text,
	"counterparty_party_name_snapshot" text,
	"signed_date" date,
	"effective_from" date,
	"effective_to" date,
	"status" text DEFAULT 'active' NOT NULL,
	"value_amount" numeric(24, 2),
	"currency_code" text,
	"external_document_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ca_licence_permit" ADD CONSTRAINT "ca_licence_permit_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_bank_account_registration" ADD CONSTRAINT "ca_bank_account_registration_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_bank_mandate" ADD CONSTRAINT "ca_bank_mandate_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_bank_mandate" ADD CONSTRAINT "ca_bank_mandate_bank_account_registration_id_ca_bank_account_registration_id_fk" FOREIGN KEY ("bank_account_registration_id") REFERENCES "public"."ca_bank_account_registration"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_bank_mandate" ADD CONSTRAINT "ca_bank_mandate_authority_mandate_id_ca_authority_mandate_id_fk" FOREIGN KEY ("authority_mandate_id") REFERENCES "public"."ca_authority_mandate"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_group_control_relationship" ADD CONSTRAINT "ca_group_control_relationship_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_group_control_relationship" ADD CONSTRAINT "ca_group_control_relationship_related_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("related_legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_material_agreement" ADD CONSTRAINT "ca_material_agreement_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_licence_permit_org_company_idx" ON "ca_licence_permit" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_licence_permit_org_number_uidx" ON "ca_licence_permit" USING btree ("organization_id","legal_company_id","normalized_licence_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_licence_permit_org_idempotency_uidx" ON "ca_licence_permit" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_bank_account_registration_org_company_idx" ON "ca_bank_account_registration" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_bank_account_registration_org_idempotency_uidx" ON "ca_bank_account_registration" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_bank_mandate_org_company_idx" ON "ca_bank_mandate" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_bank_mandate_org_idempotency_uidx" ON "ca_bank_mandate" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_group_control_relationship_org_company_idx" ON "ca_group_control_relationship" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_group_control_relationship_org_idempotency_uidx" ON "ca_group_control_relationship" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_material_agreement_org_company_idx" ON "ca_material_agreement" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_material_agreement_org_idempotency_uidx" ON "ca_material_agreement" USING btree ("organization_id","create_idempotency_key");
