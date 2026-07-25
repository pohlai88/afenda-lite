CREATE TABLE IF NOT EXISTS "ca_share_class" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"class_type" text NOT NULL,
	"par_value" numeric(24, 12),
	"currency_code" text,
	"authorized_quantity" numeric(24, 12),
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_share_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"share_class_id" uuid NOT NULL,
	"transaction_reference" text NOT NULL,
	"normalized_reference" text NOT NULL,
	"transaction_type" text NOT NULL,
	"status" text DEFAULT 'posted' NOT NULL,
	"transaction_date" date NOT NULL,
	"reversal_of_id" uuid,
	"create_idempotency_key" text NOT NULL,
	"correlation_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_share_transaction_leg" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"share_transaction_id" uuid NOT NULL,
	"share_class_id" uuid NOT NULL,
	"holder_party_id" uuid NOT NULL,
	"holder_party_code_snapshot" text,
	"holder_party_name_snapshot" text,
	"quantity_delta" numeric(24, 12) NOT NULL,
	"leg_sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_share_certificate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"share_class_id" uuid NOT NULL,
	"share_transaction_id" uuid,
	"certificate_number" text NOT NULL,
	"normalized_certificate_number" text NOT NULL,
	"holder_party_id" uuid NOT NULL,
	"holder_party_code_snapshot" text,
	"holder_party_name_snapshot" text,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_date" date NOT NULL,
	"cancelled_date" date,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_beneficial_owner_disclosure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"party_code_snapshot" text,
	"party_name_snapshot" text,
	"nature_of_control_codes" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"evidence_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ca_share_class" ADD CONSTRAINT "ca_share_class_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_share_transaction" ADD CONSTRAINT "ca_share_transaction_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_share_transaction" ADD CONSTRAINT "ca_share_transaction_share_class_id_ca_share_class_id_fk" FOREIGN KEY ("share_class_id") REFERENCES "public"."ca_share_class"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_share_transaction_leg" ADD CONSTRAINT "ca_share_transaction_leg_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_share_transaction_leg" ADD CONSTRAINT "ca_share_transaction_leg_share_transaction_id_ca_share_transaction_id_fk" FOREIGN KEY ("share_transaction_id") REFERENCES "public"."ca_share_transaction"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_share_transaction_leg" ADD CONSTRAINT "ca_share_transaction_leg_share_class_id_ca_share_class_id_fk" FOREIGN KEY ("share_class_id") REFERENCES "public"."ca_share_class"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_share_certificate" ADD CONSTRAINT "ca_share_certificate_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_share_certificate" ADD CONSTRAINT "ca_share_certificate_share_class_id_ca_share_class_id_fk" FOREIGN KEY ("share_class_id") REFERENCES "public"."ca_share_class"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_share_certificate" ADD CONSTRAINT "ca_share_certificate_share_transaction_id_ca_share_transaction_id_fk" FOREIGN KEY ("share_transaction_id") REFERENCES "public"."ca_share_transaction"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_beneficial_owner_disclosure" ADD CONSTRAINT "ca_beneficial_owner_disclosure_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_share_class_org_company_idx" ON "ca_share_class" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_share_class_org_company_code_uidx" ON "ca_share_class" USING btree ("organization_id","legal_company_id","normalized_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_share_class_org_idempotency_uidx" ON "ca_share_class" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_share_transaction_org_company_idx" ON "ca_share_transaction" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_share_transaction_org_class_idx" ON "ca_share_transaction" USING btree ("organization_id","share_class_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_share_transaction_org_reference_uidx" ON "ca_share_transaction" USING btree ("organization_id","normalized_reference");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_share_transaction_org_idempotency_uidx" ON "ca_share_transaction" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_share_transaction_leg_org_tx_idx" ON "ca_share_transaction_leg" USING btree ("organization_id","share_transaction_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_share_transaction_leg_org_holder_idx" ON "ca_share_transaction_leg" USING btree ("organization_id","holder_party_id","share_class_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_share_certificate_org_company_idx" ON "ca_share_certificate" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_share_certificate_org_number_uidx" ON "ca_share_certificate" USING btree ("organization_id","legal_company_id","normalized_certificate_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_share_certificate_org_idempotency_uidx" ON "ca_share_certificate" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_beneficial_owner_disclosure_org_company_idx" ON "ca_beneficial_owner_disclosure" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_beneficial_owner_disclosure_org_idempotency_uidx" ON "ca_beneficial_owner_disclosure" USING btree ("organization_id","create_idempotency_key");
