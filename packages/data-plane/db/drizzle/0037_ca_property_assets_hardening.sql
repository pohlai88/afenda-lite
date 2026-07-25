ALTER TABLE "ca_property_holding"
	ADD COLUMN IF NOT EXISTS "property_type" text,
	ADD COLUMN IF NOT EXISTS "valuation_reference" text,
	ADD COLUMN IF NOT EXISTS "disposal_reason" text,
	ADD COLUMN IF NOT EXISTS "disposal_evidence_reference" text,
	ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_property_holding"
SET
	"property_type" = COALESCE("property_type", 'other'),
	"create_request_fingerprint" = COALESCE("create_request_fingerprint", md5("create_idempotency_key") || md5('ca4:' || "create_idempotency_key"));
--> statement-breakpoint
ALTER TABLE "ca_property_holding"
	ALTER COLUMN "property_type" SET NOT NULL,
	ALTER COLUMN "acquisition_date" SET NOT NULL,
	ALTER COLUMN "create_request_fingerprint" SET NOT NULL,
	ADD CONSTRAINT "ca_property_holding_ownership_ck"
		CHECK ("ownership_percentage" > 0 AND "ownership_percentage" <= 100),
	ADD CONSTRAINT "ca_property_holding_chronology_ck"
		CHECK ("disposal_date" IS NULL OR "disposal_date" >= "acquisition_date"),
	ADD CONSTRAINT "ca_property_holding_status_ck"
		CHECK ("status" IN ('active', 'disposed'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_property_holding_org_company_title_idx"
	ON "ca_property_holding" ("organization_id", "legal_company_id", "normalized_title_reference");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_property_holding_active_title_uidx"
	ON "ca_property_holding" ("organization_id", "legal_company_id", "normalized_title_reference")
	WHERE "status" = 'active';
--> statement-breakpoint

ALTER TABLE "ca_corporate_asset"
	ADD COLUMN IF NOT EXISTS "normalized_identifier" text,
	ADD COLUMN IF NOT EXISTS "description" text,
	ADD COLUMN IF NOT EXISTS "terminal_reason" text,
	ADD COLUMN IF NOT EXISTS "terminal_evidence_reference" text,
	ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_corporate_asset"
SET
	"normalized_identifier" = CASE
		WHEN "asset_identifier" IS NULL THEN NULL
		ELSE upper(trim("asset_identifier"))
	END,
	"description" = COALESCE("description", "asset_identifier", "code"),
	"create_request_fingerprint" = COALESCE("create_request_fingerprint", md5("create_idempotency_key") || md5('ca4:' || "create_idempotency_key"));
--> statement-breakpoint
ALTER TABLE "ca_corporate_asset"
	ALTER COLUMN "description" SET NOT NULL,
	ALTER COLUMN "acquisition_date" SET NOT NULL,
	ALTER COLUMN "create_request_fingerprint" SET NOT NULL,
	ADD CONSTRAINT "ca_corporate_asset_terminal_ck"
		CHECK (
			("status" = 'active' AND "disposal_date" IS NULL AND "write_off_date" IS NULL)
			OR ("status" = 'disposed' AND "disposal_date" IS NOT NULL AND "write_off_date" IS NULL)
			OR ("status" = 'written_off' AND "write_off_date" IS NOT NULL AND "disposal_date" IS NULL)
		),
	ADD CONSTRAINT "ca_corporate_asset_chronology_ck"
		CHECK (
			("disposal_date" IS NULL OR "disposal_date" >= "acquisition_date")
			AND ("write_off_date" IS NULL OR "write_off_date" >= "acquisition_date")
		);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_corporate_asset_active_identifier_uidx"
	ON "ca_corporate_asset" ("organization_id", "legal_company_id", "normalized_identifier")
	WHERE "normalized_identifier" IS NOT NULL AND "status" = 'active';
--> statement-breakpoint

ALTER TABLE "ca_intellectual_property_right"
	ADD COLUMN IF NOT EXISTS "code" text,
	ADD COLUMN IF NOT EXISTS "normalized_code" text,
	ADD COLUMN IF NOT EXISTS "application_number" text,
	ADD COLUMN IF NOT EXISTS "normalized_right_number" text,
	ADD COLUMN IF NOT EXISTS "disposal_date" date,
	ADD COLUMN IF NOT EXISTS "terminal_reason" text,
	ADD COLUMN IF NOT EXISTS "terminal_evidence_reference" text,
	ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "ca_intellectual_property_right"
	ALTER COLUMN "registration_number" DROP NOT NULL;
--> statement-breakpoint
UPDATE "ca_intellectual_property_right"
SET
	"code" = COALESCE("code", "registration_number", "id"::text),
	"normalized_code" = COALESCE("normalized_code", upper(trim(COALESCE("registration_number", "id"::text)))),
	"normalized_right_number" = COALESCE("normalized_right_number", "normalized_registration_number", upper(trim(COALESCE("application_number", "id"::text)))),
	"create_request_fingerprint" = COALESCE("create_request_fingerprint", md5("create_idempotency_key") || md5('ca4:' || "create_idempotency_key"));
--> statement-breakpoint
ALTER TABLE "ca_intellectual_property_right"
	ALTER COLUMN "code" SET NOT NULL,
	ALTER COLUMN "normalized_code" SET NOT NULL,
	ALTER COLUMN "normalized_right_number" SET NOT NULL,
	ALTER COLUMN "owner_party_id" SET NOT NULL,
	ALTER COLUMN "create_request_fingerprint" SET NOT NULL,
	ADD CONSTRAINT "ca_ip_number_ck"
		CHECK ("application_number" IS NOT NULL OR "registration_number" IS NOT NULL),
	ADD CONSTRAINT "ca_ip_chronology_ck"
		CHECK (
			("grant_date" IS NULL OR "filing_date" IS NULL OR "grant_date" >= "filing_date")
			AND ("expiry_date" IS NULL OR "grant_date" IS NULL OR "expiry_date" >= "grant_date")
		),
	ADD CONSTRAINT "ca_ip_status_ck"
		CHECK ("status" IN ('pending', 'active', 'expired', 'disposed'));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_ip_identity_uidx"
	ON "ca_intellectual_property_right" (
		"organization_id", "legal_company_id", "right_type", "jurisdiction_code", "normalized_right_number"
	);
--> statement-breakpoint

ALTER TABLE "ca_insurance_policy"
	ADD COLUMN IF NOT EXISTS "covered_subject_kind" text,
	ADD COLUMN IF NOT EXISTS "covered_property_holding_id" uuid,
	ADD COLUMN IF NOT EXISTS "covered_corporate_asset_id" uuid,
	ADD COLUMN IF NOT EXISTS "covered_intellectual_property_right_id" uuid,
	ADD COLUMN IF NOT EXISTS "covered_subject_description" text,
	ADD COLUMN IF NOT EXISTS "cancellation_date" date,
	ADD COLUMN IF NOT EXISTS "cancellation_reason" text,
	ADD COLUMN IF NOT EXISTS "cancellation_evidence_reference" text,
	ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_insurance_policy"
SET
	"covered_subject_kind" = COALESCE("covered_subject_kind", 'other'),
	"covered_subject_description" = COALESCE("covered_subject_description", "covered_subject"),
	"create_request_fingerprint" = COALESCE("create_request_fingerprint", md5("create_idempotency_key") || md5('ca4:' || "create_idempotency_key"));
--> statement-breakpoint
ALTER TABLE "ca_insurance_policy"
	ALTER COLUMN "insurer_party_id" SET NOT NULL,
	ALTER COLUMN "covered_subject_kind" SET NOT NULL,
	ALTER COLUMN "document_reference" SET NOT NULL,
	ALTER COLUMN "create_request_fingerprint" SET NOT NULL,
	ADD CONSTRAINT "ca_insurance_range_ck"
		CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
	ADD CONSTRAINT "ca_insurance_money_ck"
		CHECK (("limit_amount" IS NULL) = ("currency_code" IS NULL) AND ("limit_amount" IS NULL OR "limit_amount" > 0)),
	ADD CONSTRAINT "ca_insurance_subject_ck"
		CHECK (
			("covered_subject_kind" = 'company' AND num_nonnulls("covered_property_holding_id", "covered_corporate_asset_id", "covered_intellectual_property_right_id", "covered_subject_description") = 0)
			OR ("covered_subject_kind" = 'property' AND "covered_property_holding_id" IS NOT NULL AND num_nonnulls("covered_corporate_asset_id", "covered_intellectual_property_right_id", "covered_subject_description") = 0)
			OR ("covered_subject_kind" = 'corporate-asset' AND "covered_corporate_asset_id" IS NOT NULL AND num_nonnulls("covered_property_holding_id", "covered_intellectual_property_right_id", "covered_subject_description") = 0)
			OR ("covered_subject_kind" = 'intellectual-property' AND "covered_intellectual_property_right_id" IS NOT NULL AND num_nonnulls("covered_property_holding_id", "covered_corporate_asset_id", "covered_subject_description") = 0)
			OR ("covered_subject_kind" = 'other' AND "covered_subject_description" IS NOT NULL AND num_nonnulls("covered_property_holding_id", "covered_corporate_asset_id", "covered_intellectual_property_right_id") = 0)
		);
--> statement-breakpoint

ALTER TABLE "ca_charge"
	ADD COLUMN IF NOT EXISTS "code" text,
	ADD COLUMN IF NOT EXISTS "normalized_code" text,
	ADD COLUMN IF NOT EXISTS "charge_type" text,
	ADD COLUMN IF NOT EXISTS "affected_subject_kind" text,
	ADD COLUMN IF NOT EXISTS "affected_property_holding_id" uuid,
	ADD COLUMN IF NOT EXISTS "affected_corporate_asset_id" uuid,
	ADD COLUMN IF NOT EXISTS "affected_intellectual_property_right_id" uuid,
	ADD COLUMN IF NOT EXISTS "affected_subject_description" text,
	ADD COLUMN IF NOT EXISTS "creation_evidence_reference" text,
	ADD COLUMN IF NOT EXISTS "release_reason" text,
	ADD COLUMN IF NOT EXISTS "release_evidence_reference" text,
	ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
UPDATE "ca_charge"
SET
	"code" = COALESCE("code", "id"::text),
	"normalized_code" = COALESCE("normalized_code", upper(trim(COALESCE("code", "id"::text)))),
	"charge_type" = COALESCE("charge_type", 'other'),
	"affected_subject_kind" = COALESCE("affected_subject_kind", 'other'),
	"affected_subject_description" = COALESCE("affected_subject_description", "affected_subject_reference"),
	"creation_evidence_reference" = COALESCE("creation_evidence_reference", "evidence_reference"),
	"create_request_fingerprint" = COALESCE("create_request_fingerprint", md5("create_idempotency_key") || md5('ca4:' || "create_idempotency_key"));
--> statement-breakpoint
ALTER TABLE "ca_charge"
	ALTER COLUMN "code" SET NOT NULL,
	ALTER COLUMN "normalized_code" SET NOT NULL,
	ALTER COLUMN "charge_type" SET NOT NULL,
	ALTER COLUMN "secured_party_id" SET NOT NULL,
	ALTER COLUMN "affected_subject_kind" SET NOT NULL,
	ALTER COLUMN "priority_rank" SET NOT NULL,
	ALTER COLUMN "creation_evidence_reference" SET NOT NULL,
	ALTER COLUMN "create_request_fingerprint" SET NOT NULL,
	ADD CONSTRAINT "ca_charge_money_ck"
		CHECK (("amount" IS NULL) = ("currency_code" IS NULL) AND ("amount" IS NULL OR "amount" > 0)),
	ADD CONSTRAINT "ca_charge_priority_ck" CHECK ("priority_rank" > 0),
	ADD CONSTRAINT "ca_charge_chronology_ck"
		CHECK ("released_date" IS NULL OR "released_date" >= "created_date"),
	ADD CONSTRAINT "ca_charge_subject_ck"
		CHECK (
			("affected_subject_kind" = 'company' AND num_nonnulls("affected_property_holding_id", "affected_corporate_asset_id", "affected_intellectual_property_right_id", "affected_subject_description") = 0)
			OR ("affected_subject_kind" = 'property' AND "affected_property_holding_id" IS NOT NULL AND num_nonnulls("affected_corporate_asset_id", "affected_intellectual_property_right_id", "affected_subject_description") = 0)
			OR ("affected_subject_kind" = 'corporate-asset' AND "affected_corporate_asset_id" IS NOT NULL AND num_nonnulls("affected_property_holding_id", "affected_intellectual_property_right_id", "affected_subject_description") = 0)
			OR ("affected_subject_kind" = 'intellectual-property' AND "affected_intellectual_property_right_id" IS NOT NULL AND num_nonnulls("affected_property_holding_id", "affected_corporate_asset_id", "affected_subject_description") = 0)
			OR ("affected_subject_kind" = 'other' AND "affected_subject_description" IS NOT NULL AND num_nonnulls("affected_property_holding_id", "affected_corporate_asset_id", "affected_intellectual_property_right_id") = 0)
		);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_charge_org_company_code_uidx"
	ON "ca_charge" ("organization_id", "legal_company_id", "normalized_code");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ca_intellectual_property_renewal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"intellectual_property_right_id" uuid NOT NULL REFERENCES "ca_intellectual_property_right"("id"),
	"renewal_date" date NOT NULL,
	"previous_expiry_date" date,
	"new_expiry_date" date NOT NULL,
	"evidence_reference" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "ca_ip_renewal_range_ck" CHECK ("new_expiry_date" > "renewal_date")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_ip_renewal_org_right_idx" ON "ca_intellectual_property_renewal" ("organization_id", "intellectual_property_right_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_ip_renewal_org_idempotency_uidx" ON "ca_intellectual_property_renewal" ("organization_id", "idempotency_key");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ca_insurance_policy_renewal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"insurance_policy_id" uuid NOT NULL REFERENCES "ca_insurance_policy"("id"),
	"renewal_date" date NOT NULL,
	"previous_effective_to" date,
	"new_effective_to" date NOT NULL,
	"limit_amount" numeric(24,12),
	"currency_code" text,
	"document_reference" text NOT NULL,
	"evidence_reference" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "ca_insurance_renewal_range_ck" CHECK ("new_effective_to" >= "renewal_date"),
	CONSTRAINT "ca_insurance_renewal_money_ck" CHECK (("limit_amount" IS NULL) = ("currency_code" IS NULL))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_insurance_renewal_org_policy_idx" ON "ca_insurance_policy_renewal" ("organization_id", "insurance_policy_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_insurance_renewal_org_idempotency_uidx" ON "ca_insurance_policy_renewal" ("organization_id", "idempotency_key");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ca_charge_variation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL REFERENCES "ca_charge"("id"),
	"variation_date" date NOT NULL,
	"amount" numeric(24,12),
	"currency_code" text,
	"priority_rank" integer NOT NULL,
	"evidence_reference" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "ca_charge_variation_money_ck" CHECK (("amount" IS NULL) = ("currency_code" IS NULL)),
	CONSTRAINT "ca_charge_variation_priority_ck" CHECK ("priority_rank" > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_charge_variation_org_charge_idx" ON "ca_charge_variation" ("organization_id", "charge_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_charge_variation_org_idempotency_uidx" ON "ca_charge_variation" ("organization_id", "idempotency_key");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ca_property_asset_mutation_receipt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"command_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"result_version" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "ca_property_asset_receipt_entity_ck"
		CHECK ("entity_type" IN ('property', 'asset', 'intellectual-property', 'insurance-policy', 'charge'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_property_asset_receipt_org_key_uidx"
	ON "ca_property_asset_mutation_receipt" ("organization_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_property_asset_receipt_org_entity_idx"
	ON "ca_property_asset_mutation_receipt" ("organization_id", "entity_type", "entity_id");
--> statement-breakpoint

ALTER TABLE "ca_insurance_policy"
	ADD CONSTRAINT "ca_insurance_covered_property_fk" FOREIGN KEY ("covered_property_holding_id") REFERENCES "ca_property_holding"("id"),
	ADD CONSTRAINT "ca_insurance_covered_asset_fk" FOREIGN KEY ("covered_corporate_asset_id") REFERENCES "ca_corporate_asset"("id"),
	ADD CONSTRAINT "ca_insurance_covered_ip_fk" FOREIGN KEY ("covered_intellectual_property_right_id") REFERENCES "ca_intellectual_property_right"("id");
--> statement-breakpoint
ALTER TABLE "ca_charge"
	ADD CONSTRAINT "ca_charge_affected_property_fk" FOREIGN KEY ("affected_property_holding_id") REFERENCES "ca_property_holding"("id"),
	ADD CONSTRAINT "ca_charge_affected_asset_fk" FOREIGN KEY ("affected_corporate_asset_id") REFERENCES "ca_corporate_asset"("id"),
	ADD CONSTRAINT "ca_charge_affected_ip_fk" FOREIGN KEY ("affected_intellectual_property_right_id") REFERENCES "ca_intellectual_property_right"("id");
