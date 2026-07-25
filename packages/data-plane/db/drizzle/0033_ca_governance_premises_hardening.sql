ALTER TABLE "ca_officer_appointment" ADD COLUMN IF NOT EXISTS "request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_officer_appointment" SET "request_fingerprint" = 'legacy:' || "id"::text WHERE "request_fingerprint" IS NULL;
--> statement-breakpoint
ALTER TABLE "ca_officer_appointment" ALTER COLUMN "request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ca_officer_appointment" ADD COLUMN IF NOT EXISTS "supersedes_officer_appointment_id" uuid;
--> statement-breakpoint
ALTER TABLE "ca_officer_appointment" ADD COLUMN IF NOT EXISTS "amendment_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_officer_appointment" ADD COLUMN IF NOT EXISTS "end_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_officer_appointment" ADD COLUMN IF NOT EXISTS "end_evidence_reference" text;
--> statement-breakpoint
ALTER TABLE "ca_governance_body" ADD COLUMN IF NOT EXISTS "request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_governance_body" SET "request_fingerprint" = 'legacy:' || "id"::text WHERE "request_fingerprint" IS NULL;
--> statement-breakpoint
ALTER TABLE "ca_governance_body" ALTER COLUMN "request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ca_governance_body" ADD COLUMN IF NOT EXISTS "retired_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "ca_governance_body" ADD COLUMN IF NOT EXISTS "retired_by" text;
--> statement-breakpoint
ALTER TABLE "ca_governance_body" ADD COLUMN IF NOT EXISTS "retirement_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_governance_membership" ADD COLUMN IF NOT EXISTS "request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_governance_membership" SET "request_fingerprint" = 'legacy:' || "id"::text WHERE "request_fingerprint" IS NULL;
--> statement-breakpoint
ALTER TABLE "ca_governance_membership" ALTER COLUMN "request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ca_governance_membership" ADD COLUMN IF NOT EXISTS "end_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ADD COLUMN IF NOT EXISTS "request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_authority_mandate" SET "request_fingerprint" = 'legacy:' || "id"::text WHERE "request_fingerprint" IS NULL;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ALTER COLUMN "request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ADD COLUMN IF NOT EXISTS "minimum_signatories" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ADD COLUMN IF NOT EXISTS "supersedes_authority_mandate_id" uuid;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ADD COLUMN IF NOT EXISTS "amendment_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ADD COLUMN IF NOT EXISTS "revocation_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_company_premise" ADD COLUMN IF NOT EXISTS "request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_company_premise" SET "request_fingerprint" = 'legacy:' || "id"::text WHERE "request_fingerprint" IS NULL;
--> statement-breakpoint
ALTER TABLE "ca_company_premise" ALTER COLUMN "request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ca_company_premise" ADD COLUMN IF NOT EXISTS "supersedes_company_premise_id" uuid;
--> statement-breakpoint
ALTER TABLE "ca_company_premise" ADD COLUMN IF NOT EXISTS "amendment_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_company_premise" ADD COLUMN IF NOT EXISTS "retirement_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_governance_meeting" ADD COLUMN IF NOT EXISTS "request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_governance_meeting" SET "request_fingerprint" = 'legacy:' || "id"::text WHERE "request_fingerprint" IS NULL;
--> statement-breakpoint
ALTER TABLE "ca_governance_meeting" ALTER COLUMN "request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ca_governance_meeting" ADD COLUMN IF NOT EXISTS "corrects_governance_meeting_id" uuid;
--> statement-breakpoint
ALTER TABLE "ca_governance_meeting" ADD COLUMN IF NOT EXISTS "correction_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_governance_meeting" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "ca_governance_meeting" ADD COLUMN IF NOT EXISTS "closed_by" text;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD COLUMN IF NOT EXISTS "request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_resolution" SET "request_fingerprint" = 'legacy:' || "id"::text WHERE "request_fingerprint" IS NULL;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ALTER COLUMN "request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD COLUMN IF NOT EXISTS "approval_evidence_reference" text;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD COLUMN IF NOT EXISTS "supersedes_resolution_id" uuid;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD COLUMN IF NOT EXISTS "superseded_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD COLUMN IF NOT EXISTS "revoked_date" date;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD COLUMN IF NOT EXISTS "revocation_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD COLUMN IF NOT EXISTS "revocation_evidence_reference" text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ca_authority_mandate_holder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"authority_mandate_id" uuid NOT NULL,
	"holder_kind" text NOT NULL,
	"party_id" uuid,
	"party_code_snapshot" text,
	"party_name_snapshot" text,
	"officer_appointment_id" uuid,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_authority_mandate_holder_kind_check" CHECK (
		("holder_kind" = 'party' AND "party_id" IS NOT NULL AND "officer_appointment_id" IS NULL)
		OR ("holder_kind" = 'officer' AND "party_id" IS NULL AND "officer_appointment_id" IS NOT NULL)
	),
	CONSTRAINT "ca_authority_mandate_holder_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint

ALTER TABLE "ca_officer_appointment" ADD CONSTRAINT "ca_officer_appointment_range_check" CHECK ("resigned_date" IS NULL OR "resigned_date" >= "appointed_date");
--> statement-breakpoint
ALTER TABLE "ca_governance_membership" ADD CONSTRAINT "ca_governance_membership_subject_check" CHECK (
	("member_party_id" IS NOT NULL AND "officer_appointment_id" IS NULL)
	OR ("member_party_id" IS NULL AND "officer_appointment_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "ca_governance_membership" ADD CONSTRAINT "ca_governance_membership_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ADD CONSTRAINT "ca_authority_mandate_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ADD CONSTRAINT "ca_authority_mandate_amount_currency_check" CHECK (
	("amount_limit" IS NULL AND "currency_code" IS NULL)
	OR ("amount_limit" IS NOT NULL AND "amount_limit" > 0 AND "currency_code" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ADD CONSTRAINT "ca_authority_mandate_signatory_check" CHECK (
	("signing_rule" = 'single' AND "minimum_signatories" = 1)
	OR ("signing_rule" = 'joint' AND "minimum_signatories" >= 2)
);
--> statement-breakpoint
ALTER TABLE "ca_company_premise" ADD CONSTRAINT "ca_company_premise_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD CONSTRAINT "ca_resolution_approved_state_check" CHECK (
	("status" <> 'approved') OR ("approved_date" IS NOT NULL AND "approval_evidence_reference" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD CONSTRAINT "ca_resolution_revoked_state_check" CHECK (
	("status" <> 'revoked') OR ("revoked_date" IS NOT NULL AND "revocation_reason" IS NOT NULL)
);
--> statement-breakpoint

ALTER TABLE "ca_officer_appointment" ADD CONSTRAINT "ca_officer_appointment_supersedes_fk" FOREIGN KEY ("supersedes_officer_appointment_id") REFERENCES "public"."ca_officer_appointment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate" ADD CONSTRAINT "ca_authority_mandate_supersedes_fk" FOREIGN KEY ("supersedes_authority_mandate_id") REFERENCES "public"."ca_authority_mandate"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_premise" ADD CONSTRAINT "ca_company_premise_supersedes_fk" FOREIGN KEY ("supersedes_company_premise_id") REFERENCES "public"."ca_company_premise"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_governance_meeting" ADD CONSTRAINT "ca_governance_meeting_corrects_fk" FOREIGN KEY ("corrects_governance_meeting_id") REFERENCES "public"."ca_governance_meeting"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD CONSTRAINT "ca_resolution_supersedes_fk" FOREIGN KEY ("supersedes_resolution_id") REFERENCES "public"."ca_resolution"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate_holder" ADD CONSTRAINT "ca_authority_mandate_holder_company_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate_holder" ADD CONSTRAINT "ca_authority_mandate_holder_mandate_fk" FOREIGN KEY ("authority_mandate_id") REFERENCES "public"."ca_authority_mandate"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_authority_mandate_holder" ADD CONSTRAINT "ca_authority_mandate_holder_officer_fk" FOREIGN KEY ("officer_appointment_id") REFERENCES "public"."ca_officer_appointment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "ca_officer_appointment_org_company_role_party_range_idx" ON "ca_officer_appointment" ("organization_id", "legal_company_id", "officer_role", "party_id", "appointed_date", "resigned_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_governance_membership_org_body_range_idx" ON "ca_governance_membership" ("organization_id", "governance_body_id", "effective_from", "effective_to");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_authority_mandate_org_company_range_idx" ON "ca_authority_mandate" ("organization_id", "legal_company_id", "effective_from", "effective_to");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_premise_org_company_primary_range_idx" ON "ca_company_premise" ("organization_id", "legal_company_id", "premise_type", "is_primary", "effective_from", "effective_to");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_authority_mandate_holder_org_mandate_idx" ON "ca_authority_mandate_holder" ("organization_id", "authority_mandate_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_authority_mandate_holder_org_company_idx" ON "ca_authority_mandate_holder" ("organization_id", "legal_company_id");
