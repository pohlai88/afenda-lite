CREATE TABLE IF NOT EXISTS "ca_authority_mandate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"mandate_type" text NOT NULL,
	"holder_party_id" text,
	"holder_officer_appointment_id" uuid,
	"granted_by_type" text NOT NULL,
	"granting_resolution_id" uuid,
	"scope_description" text NOT NULL,
	"monetary_limit_amount" text,
	"monetary_limit_currency_code" text,
	"jurisdiction_code" text,
	"protected_authority" boolean DEFAULT false NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'active' NOT NULL,
	"revocation_reason" text,
	"source_document_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_authority_mandate_type_check" CHECK ("mandate_type" IN ('signing_authority', 'bank_mandate', 'power_of_attorney', 'delegated_authority', 'other')),
	CONSTRAINT "ca_authority_mandate_granted_by_check" CHECK ("granted_by_type" IN ('board_resolution', 'shareholder_resolution', 'statutory_office', 'power_of_attorney')),
	CONSTRAINT "ca_authority_mandate_holder_check" CHECK (("holder_party_id" IS NULL) <> ("holder_officer_appointment_id" IS NULL)),
	CONSTRAINT "ca_authority_mandate_holder_party_check" CHECK ("holder_party_id" IS NULL OR char_length(btrim("holder_party_id")) > 0),
	CONSTRAINT "ca_authority_mandate_scope_check" CHECK (char_length(btrim("scope_description")) > 0),
	CONSTRAINT "ca_authority_mandate_monetary_pair_check" CHECK (("monetary_limit_amount" IS NULL) = ("monetary_limit_currency_code" IS NULL)),
	CONSTRAINT "ca_authority_mandate_monetary_amount_check" CHECK ("monetary_limit_amount" IS NULL OR "monetary_limit_amount" ~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$'),
	CONSTRAINT "ca_authority_mandate_currency_check" CHECK ("monetary_limit_currency_code" IS NULL OR "monetary_limit_currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "ca_authority_mandate_jurisdiction_check" CHECK ("jurisdiction_code" IS NULL OR "jurisdiction_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_authority_mandate_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_from" < "effective_to"),
	CONSTRAINT "ca_authority_mandate_status_check" CHECK ("status" IN ('active', 'revoked', 'expired')),
	CONSTRAINT "ca_authority_mandate_revocation_check" CHECK (("status" = 'revoked' AND "effective_to" IS NOT NULL AND "revocation_reason" IS NOT NULL) OR ("status" <> 'revoked' AND "revocation_reason" IS NULL)),
	CONSTRAINT "ca_authority_mandate_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_authority_mandate_version_check" CHECK ("version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_authority_mandate_org_id_uidx" ON "ca_authority_mandate" ("organization_id", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_authority_mandate_org_company_idx" ON "ca_authority_mandate" ("organization_id", "legal_company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_authority_mandate_org_company_status_idx" ON "ca_authority_mandate" ("organization_id", "legal_company_id", "status");
