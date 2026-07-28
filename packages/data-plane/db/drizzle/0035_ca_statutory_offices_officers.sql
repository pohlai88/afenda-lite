CREATE TABLE IF NOT EXISTS "ca_statutory_office" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"office_type_code" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"required" boolean DEFAULT true NOT NULL,
	"minimum_holders" integer DEFAULT 1 NOT NULL,
	"maximum_holders" integer,
	"vacancy_grace_days" integer DEFAULT 0 NOT NULL,
	"protected_role" boolean DEFAULT false NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'active' NOT NULL,
	"retirement_reason" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_statutory_office_code_check" CHECK ("office_type_code" ~ '^[A-Z0-9][A-Z0-9._-]*$'),
	CONSTRAINT "ca_statutory_office_jurisdiction_check" CHECK ("jurisdiction_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_statutory_office_display_check" CHECK (char_length(btrim("display_name")) > 0),
	CONSTRAINT "ca_statutory_office_holder_count_check" CHECK ("minimum_holders" > 0 AND ("maximum_holders" IS NULL OR "maximum_holders" >= "minimum_holders")),
	CONSTRAINT "ca_statutory_office_grace_check" CHECK ("vacancy_grace_days" >= 0),
	CONSTRAINT "ca_statutory_office_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_from" < "effective_to"),
	CONSTRAINT "ca_statutory_office_status_check" CHECK ("status" IN ('active', 'retired')),
	CONSTRAINT "ca_statutory_office_retirement_check" CHECK (("status" = 'retired' AND "effective_to" IS NOT NULL AND "retirement_reason" IS NOT NULL) OR "status" = 'active'),
	CONSTRAINT "ca_statutory_office_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_statutory_office_version_check" CHECK ("version" > 0)
);

CREATE TABLE IF NOT EXISTS "ca_officer_appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"statutory_office_id" uuid NOT NULL,
	"officer_party_id" text NOT NULL,
	"appointment_method" text NOT NULL,
	"appointing_authority_type" text NOT NULL,
	"appointing_authority_id" text,
	"consent_document_id" text NOT NULL,
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
	CONSTRAINT "ca_officer_appointment_method_check" CHECK ("appointment_method" IN ('board_resolution', 'shareholder_resolution', 'statutory_filing', 'delegated_authority', 'court_order', 'other')),
	CONSTRAINT "ca_officer_appointment_authority_type_check" CHECK ("appointing_authority_type" IN ('governance_body', 'shareholder_body', 'statutory_authority', 'court', 'delegated_role', 'other')),
	CONSTRAINT "ca_officer_appointment_party_check" CHECK (char_length(btrim("officer_party_id")) > 0),
	CONSTRAINT "ca_officer_appointment_document_check" CHECK (char_length(btrim("consent_document_id")) > 0 AND char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_officer_appointment_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_from" < "effective_to"),
	CONSTRAINT "ca_officer_appointment_status_check" CHECK ("status" IN ('active', 'resigned', 'removed', 'ended')),
	CONSTRAINT "ca_officer_appointment_end_check" CHECK (("status" = 'active' AND "end_reason" IS NULL) OR ("status" <> 'active' AND "effective_to" IS NOT NULL AND "end_reason" IS NOT NULL)),
	CONSTRAINT "ca_officer_appointment_version_check" CHECK ("version" > 0)
);

CREATE TABLE IF NOT EXISTS "ca_officer_qualification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"officer_appointment_id" uuid NOT NULL,
	"qualification_type_code" text NOT NULL,
	"issuer" text NOT NULL,
	"reference_number" text,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"verification_status" text NOT NULL,
	"verified_at" timestamp with time zone,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_officer_qualification_type_check" CHECK ("qualification_type_code" ~ '^[A-Z0-9][A-Z0-9._-]*$'),
	CONSTRAINT "ca_officer_qualification_issuer_check" CHECK (char_length(btrim("issuer")) > 0),
	CONSTRAINT "ca_officer_qualification_valid_range_check" CHECK ("valid_to" IS NULL OR "valid_from" < "valid_to"),
	CONSTRAINT "ca_officer_qualification_status_check" CHECK ("verification_status" IN ('pending', 'verified', 'rejected', 'expired')),
	CONSTRAINT "ca_officer_qualification_verified_check" CHECK ("verification_status" <> 'verified' OR "verified_at" IS NOT NULL),
	CONSTRAINT "ca_officer_qualification_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_officer_qualification_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "ca_statutory_office_natural_key_uidx" ON "ca_statutory_office" ("organization_id", "legal_company_id", "jurisdiction_code", "office_type_code");
CREATE UNIQUE INDEX IF NOT EXISTS "ca_statutory_office_org_company_id_uidx" ON "ca_statutory_office" ("organization_id", "legal_company_id", "id");
CREATE INDEX IF NOT EXISTS "ca_statutory_office_as_of_idx" ON "ca_statutory_office" ("organization_id", "legal_company_id", "jurisdiction_code", "required", "status", "effective_from", "effective_to");
CREATE UNIQUE INDEX IF NOT EXISTS "ca_officer_appointment_org_company_id_uidx" ON "ca_officer_appointment" ("organization_id", "legal_company_id", "id");
CREATE INDEX IF NOT EXISTS "ca_officer_appointment_office_as_of_idx" ON "ca_officer_appointment" ("organization_id", "statutory_office_id", "status", "effective_from", "effective_to");
CREATE INDEX IF NOT EXISTS "ca_officer_appointment_party_idx" ON "ca_officer_appointment" ("organization_id", "officer_party_id", "effective_from", "effective_to");
CREATE UNIQUE INDEX IF NOT EXISTS "ca_officer_qualification_org_company_id_uidx" ON "ca_officer_qualification" ("organization_id", "legal_company_id", "id");
CREATE INDEX IF NOT EXISTS "ca_officer_qualification_appointment_idx" ON "ca_officer_qualification" ("organization_id", "officer_appointment_id", "valid_from", "valid_to");
