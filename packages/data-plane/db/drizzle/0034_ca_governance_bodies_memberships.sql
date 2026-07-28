CREATE TABLE IF NOT EXISTS "ca_governance_body" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"body_type" text NOT NULL,
	"body_code" text NOT NULL,
	"normalized_body_code" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
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
	CONSTRAINT "ca_governance_body_type_check" CHECK ("body_type" IN ('board', 'committee', 'shareholder_body', 'configured_statutory_body')),
	CONSTRAINT "ca_governance_body_code_check" CHECK (char_length(btrim("body_code")) > 0 AND "normalized_body_code" ~ '^[A-Z0-9][A-Z0-9._-]*$'),
	CONSTRAINT "ca_governance_body_display_check" CHECK (char_length(btrim("display_name")) > 0),
	CONSTRAINT "ca_governance_body_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_from" < "effective_to"),
	CONSTRAINT "ca_governance_body_status_check" CHECK ("status" IN ('active', 'retired')),
	CONSTRAINT "ca_governance_body_retirement_check" CHECK (("status" = 'retired' AND "effective_to" IS NOT NULL AND "retirement_reason" IS NOT NULL) OR "status" = 'active'),
	CONSTRAINT "ca_governance_body_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_governance_body_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "ca_governance_body_natural_key_uidx" ON "ca_governance_body" USING btree ("organization_id","legal_company_id","normalized_body_code");
CREATE UNIQUE INDEX IF NOT EXISTS "ca_governance_body_org_company_id_uidx" ON "ca_governance_body" USING btree ("organization_id","legal_company_id","id");
CREATE INDEX IF NOT EXISTS "ca_governance_body_as_of_idx" ON "ca_governance_body" USING btree ("organization_id","legal_company_id","body_type","status","effective_from","effective_to");

CREATE TABLE IF NOT EXISTS "ca_governance_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"governance_body_id" uuid NOT NULL,
	"member_kind" text NOT NULL,
	"member_party_id" text,
	"role_seat_code" text,
	"seat_label" text NOT NULL,
	"membership_role" text NOT NULL,
	"voting_entitlement" text NOT NULL,
	"is_chair" boolean DEFAULT false NOT NULL,
	"term_from" date NOT NULL,
	"term_to" date,
	"status" text DEFAULT 'active' NOT NULL,
	"end_reason" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_governance_membership_kind_check" CHECK ("member_kind" IN ('party', 'role_seat')),
	CONSTRAINT "ca_governance_membership_member_ref_check" CHECK (("member_kind" = 'party' AND "member_party_id" IS NOT NULL AND "role_seat_code" IS NULL) OR ("member_kind" = 'role_seat' AND "member_party_id" IS NULL AND "role_seat_code" IS NOT NULL)),
	CONSTRAINT "ca_governance_membership_role_seat_check" CHECK ("role_seat_code" IS NULL OR "role_seat_code" ~ '^[A-Z0-9][A-Z0-9._-]*$'),
	CONSTRAINT "ca_governance_membership_seat_label_check" CHECK (char_length(btrim("seat_label")) > 0),
	CONSTRAINT "ca_governance_membership_role_check" CHECK ("membership_role" IN ('member', 'secretary', 'observer', 'advisor')),
	CONSTRAINT "ca_governance_membership_voting_check" CHECK ("voting_entitlement" IN ('voting', 'non_voting')),
	CONSTRAINT "ca_governance_membership_term_range_check" CHECK ("term_to" IS NULL OR "term_from" < "term_to"),
	CONSTRAINT "ca_governance_membership_status_check" CHECK ("status" IN ('active', 'ended')),
	CONSTRAINT "ca_governance_membership_end_check" CHECK (("status" = 'ended' AND "term_to" IS NOT NULL AND "end_reason" IS NOT NULL) OR "status" = 'active'),
	CONSTRAINT "ca_governance_membership_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_governance_membership_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "ca_governance_membership_org_company_id_uidx" ON "ca_governance_membership" USING btree ("organization_id","legal_company_id","id");
CREATE INDEX IF NOT EXISTS "ca_governance_membership_body_as_of_idx" ON "ca_governance_membership" USING btree ("organization_id","governance_body_id","status","term_from","term_to");
CREATE INDEX IF NOT EXISTS "ca_governance_membership_party_idx" ON "ca_governance_membership" USING btree ("organization_id","member_party_id","term_from","term_to");
