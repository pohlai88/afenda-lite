CREATE TABLE IF NOT EXISTS "ca_officer_declaration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"officer_appointment_id" uuid NOT NULL,
	"declaration_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"effective_from" date NOT NULL,
	"expires_on" date,
	"sensitive_detail_ref" text,
	"masked_summary" text,
	"source_document_id" text NOT NULL,
	"superseded_at" timestamp with time zone,
	"superseded_by_declaration_id" uuid,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_officer_declaration_type_check" CHECK ("declaration_type" IN ('consent', 'eligibility', 'interest', 'independence', 'fit_and_proper', 'related_party')),
	CONSTRAINT "ca_officer_declaration_status_check" CHECK ("status" IN ('active', 'superseded', 'expired')),
	CONSTRAINT "ca_officer_declaration_effective_range_check" CHECK ("expires_on" IS NULL OR "effective_from" < "expires_on"),
	CONSTRAINT "ca_officer_declaration_sensitive_check" CHECK ("sensitive_detail_ref" IS NOT NULL OR "masked_summary" IS NOT NULL),
	CONSTRAINT "ca_officer_declaration_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_officer_declaration_version_check" CHECK ("version" > 0)
);

CREATE TABLE IF NOT EXISTS "ca_officer_disqualification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"officer_appointment_id" uuid NOT NULL,
	"reason_code" text NOT NULL,
	"authority_reference" text,
	"source_document_id" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'active' NOT NULL,
	"end_reason" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_officer_disqualification_reason_check" CHECK ("reason_code" ~ '^[A-Z0-9][A-Z0-9._-]*$'),
	CONSTRAINT "ca_officer_disqualification_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_from" < "effective_to"),
	CONSTRAINT "ca_officer_disqualification_status_check" CHECK ("status" IN ('active', 'ended')),
	CONSTRAINT "ca_officer_disqualification_end_check" CHECK (("status" = 'active' AND "end_reason" IS NULL) OR ("status" = 'ended' AND "effective_to" IS NOT NULL AND "end_reason" IS NOT NULL)),
	CONSTRAINT "ca_officer_disqualification_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_officer_disqualification_version_check" CHECK ("version" > 0)
);

CREATE TABLE IF NOT EXISTS "ca_conflict_disclosure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"officer_appointment_id" uuid NOT NULL,
	"matter_type" text NOT NULL,
	"matter_id" text NOT NULL,
	"conflict_type_code" text NOT NULL,
	"status" text DEFAULT 'disclosed' NOT NULL,
	"sensitive_detail_ref" text,
	"masked_summary" text,
	"disclosed_at" timestamp with time zone NOT NULL,
	"recusal_recorded_at" timestamp with time zone,
	"recusal_reason" text,
	"source_document_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_conflict_disclosure_matter_type_check" CHECK ("matter_type" IN ('meeting', 'resolution', 'transaction', 'corporate_action')),
	CONSTRAINT "ca_conflict_disclosure_conflict_type_check" CHECK ("conflict_type_code" ~ '^[A-Z0-9][A-Z0-9._-]*$'),
	CONSTRAINT "ca_conflict_disclosure_status_check" CHECK ("status" IN ('disclosed', 'recused', 'cleared')),
	CONSTRAINT "ca_conflict_disclosure_sensitive_check" CHECK ("sensitive_detail_ref" IS NOT NULL OR "masked_summary" IS NOT NULL),
	CONSTRAINT "ca_conflict_disclosure_recusal_check" CHECK (("status" = 'recused' AND "recusal_recorded_at" IS NOT NULL AND "recusal_reason" IS NOT NULL) OR "status" <> 'recused'),
	CONSTRAINT "ca_conflict_disclosure_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_conflict_disclosure_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "ca_officer_declaration_org_company_id_uidx" ON "ca_officer_declaration" ("organization_id", "legal_company_id", "id");
CREATE INDEX IF NOT EXISTS "ca_officer_declaration_appointment_idx" ON "ca_officer_declaration" ("organization_id", "officer_appointment_id", "declaration_type", "status", "effective_from", "expires_on");
CREATE INDEX IF NOT EXISTS "ca_officer_declaration_expiry_idx" ON "ca_officer_declaration" ("organization_id", "legal_company_id", "status", "expires_on");
CREATE UNIQUE INDEX IF NOT EXISTS "ca_officer_disqualification_org_company_id_uidx" ON "ca_officer_disqualification" ("organization_id", "legal_company_id", "id");
CREATE INDEX IF NOT EXISTS "ca_officer_disqualification_as_of_idx" ON "ca_officer_disqualification" ("organization_id", "legal_company_id", "officer_appointment_id", "status", "effective_from", "effective_to");
CREATE UNIQUE INDEX IF NOT EXISTS "ca_conflict_disclosure_org_company_id_uidx" ON "ca_conflict_disclosure" ("organization_id", "legal_company_id", "id");
CREATE INDEX IF NOT EXISTS "ca_conflict_disclosure_matter_idx" ON "ca_conflict_disclosure" ("organization_id", "legal_company_id", "matter_type", "matter_id", "status");
