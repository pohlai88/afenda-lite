CREATE TABLE IF NOT EXISTS "ca_officer_appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"officer_role" text NOT NULL,
	"party_id" uuid,
	"party_code_snapshot" text,
	"party_name_snapshot" text,
	"appointed_date" date NOT NULL,
	"resigned_date" date,
	"authority_limits" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_governance_body" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"body_type" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_governance_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"governance_body_id" uuid NOT NULL,
	"member_party_id" uuid,
	"member_party_code_snapshot" text,
	"member_party_name_snapshot" text,
	"officer_appointment_id" uuid,
	"role_title" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_authority_mandate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"mandate_type" text NOT NULL,
	"scope_description" text NOT NULL,
	"amount_limit" numeric,
	"currency_code" text,
	"signing_rule" text DEFAULT 'single' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"grant_evidence_reference" text,
	"revocation_evidence_reference" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_company_premise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"premise_type" text NOT NULL,
	"party_address_id" uuid,
	"address_line1_snapshot" text NOT NULL,
	"address_line2_snapshot" text,
	"city_snapshot" text,
	"region_snapshot" text,
	"postal_code_snapshot" text,
	"country_code_snapshot" text,
	"is_primary" boolean DEFAULT false NOT NULL,
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
CREATE TABLE IF NOT EXISTS "ca_governance_meeting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"governance_body_id" uuid NOT NULL,
	"meeting_at" timestamp with time zone NOT NULL,
	"quorum_result" text DEFAULT 'pending' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"minutes_document_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_resolution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"governance_meeting_id" uuid,
	"resolution_number" text NOT NULL,
	"resolution_year" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_date" date,
	"superseded_by_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ca_officer_appointment" ADD CONSTRAINT "ca_officer_appointment_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_governance_body" ADD CONSTRAINT "ca_governance_body_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_governance_membership" ADD CONSTRAINT "ca_governance_membership_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_governance_membership" ADD CONSTRAINT "ca_governance_membership_governance_body_id_ca_governance_body_id_fk" FOREIGN KEY ("governance_body_id") REFERENCES "public"."ca_governance_body"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_governance_membership" ADD CONSTRAINT "ca_governance_membership_officer_appointment_id_ca_officer_appointment_id_fk" FOREIGN KEY ("officer_appointment_id") REFERENCES "public"."ca_officer_appointment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ADD CONSTRAINT "ca_authority_mandate_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_premise" ADD CONSTRAINT "ca_company_premise_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_governance_meeting" ADD CONSTRAINT "ca_governance_meeting_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_governance_meeting" ADD CONSTRAINT "ca_governance_meeting_governance_body_id_ca_governance_body_id_fk" FOREIGN KEY ("governance_body_id") REFERENCES "public"."ca_governance_body"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD CONSTRAINT "ca_resolution_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD CONSTRAINT "ca_resolution_governance_meeting_id_ca_governance_meeting_id_fk" FOREIGN KEY ("governance_meeting_id") REFERENCES "public"."ca_governance_meeting"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_officer_appointment_org_company_idx" ON "ca_officer_appointment" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_officer_appointment_org_idempotency_uidx" ON "ca_officer_appointment" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_governance_body_org_company_idx" ON "ca_governance_body" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_governance_body_org_company_code_uidx" ON "ca_governance_body" USING btree ("organization_id","legal_company_id","normalized_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_governance_body_org_idempotency_uidx" ON "ca_governance_body" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_governance_membership_org_company_idx" ON "ca_governance_membership" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_governance_membership_org_body_idx" ON "ca_governance_membership" USING btree ("organization_id","governance_body_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_governance_membership_org_idempotency_uidx" ON "ca_governance_membership" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_authority_mandate_org_company_idx" ON "ca_authority_mandate" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_authority_mandate_org_idempotency_uidx" ON "ca_authority_mandate" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_premise_org_company_idx" ON "ca_company_premise" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_premise_org_idempotency_uidx" ON "ca_company_premise" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_governance_meeting_org_company_idx" ON "ca_governance_meeting" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_governance_meeting_org_body_idx" ON "ca_governance_meeting" USING btree ("organization_id","governance_body_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_governance_meeting_org_idempotency_uidx" ON "ca_governance_meeting" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_resolution_org_company_idx" ON "ca_resolution" USING btree ("organization_id","legal_company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_resolution_org_company_year_number_uidx" ON "ca_resolution" USING btree ("organization_id","legal_company_id","resolution_year","resolution_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_resolution_org_idempotency_uidx" ON "ca_resolution" USING btree ("organization_id","create_idempotency_key");
