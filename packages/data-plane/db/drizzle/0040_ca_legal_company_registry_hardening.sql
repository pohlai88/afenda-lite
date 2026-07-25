-- CA-1 legal-company registry hardening to match enterprise Drizzle contract.
--> statement-breakpoint

ALTER TABLE "ca_legal_company" DROP CONSTRAINT IF EXISTS "ca_legal_company_status_check";
--> statement-breakpoint
ALTER TABLE "ca_legal_company" DROP CONSTRAINT IF EXISTS "ca_legal_company_fiscal_month_check";
--> statement-breakpoint
ALTER TABLE "ca_legal_company" DROP CONSTRAINT IF EXISTS "ca_legal_company_fiscal_day_check";
--> statement-breakpoint
ALTER TABLE "ca_legal_company" DROP CONSTRAINT IF EXISTS "ca_legal_company_fiscal_pair_check";
--> statement-breakpoint
ALTER TABLE "ca_legal_company" DROP CONSTRAINT IF EXISTS "ca_legal_company_legal_entity_dimension_id_md_organization_dimension_id_fk";
--> statement-breakpoint
ALTER TABLE "ca_legal_company" DROP CONSTRAINT IF EXISTS "ca_legal_company_legal_party_id_md_party_id_fk";
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_legal_entity_dimension_id_md_organization_dimension_id_fk" FOREIGN KEY ("legal_entity_dimension_id") REFERENCES "public"."md_organization_dimension"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_legal_party_id_md_party_id_fk" FOREIGN KEY ("legal_party_id") REFERENCES "public"."md_party"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
DROP INDEX IF EXISTS "ca_legal_company_org_status_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_legal_company_org_status_idx" ON "ca_legal_company" USING btree ("organization_id","status","normalized_code","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_legal_company_org_party_idx" ON "ca_legal_company" USING btree ("organization_id","legal_party_id");
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_status_chk" CHECK ("status" IN ('draft', 'active', 'suspended', 'dissolved', 'archived'));
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_version_chk" CHECK ("version" >= 1);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_code_chk" CHECK (length(btrim("code")) > 0);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_normalized_code_chk" CHECK (length(btrim("normalized_code")) > 0);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_dimension_key_chk" CHECK (length(btrim("legal_entity_key_snapshot")) > 0);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_dimension_name_chk" CHECK (length(btrim("legal_entity_name_snapshot")) > 0);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_fye_month_chk" CHECK ("fiscal_year_end_month" IS NULL OR "fiscal_year_end_month" BETWEEN 1 AND 12);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_fye_day_chk" CHECK ("fiscal_year_end_day" IS NULL OR "fiscal_year_end_day" BETWEEN 1 AND 31);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_fye_pair_chk" CHECK (
	("fiscal_year_end_month" IS NULL AND "fiscal_year_end_day" IS NULL)
	OR ("fiscal_year_end_month" IS NOT NULL AND "fiscal_year_end_day" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_date_chronology_chk" CHECK (
	"incorporation_date" IS NULL
	OR "commencement_date" IS NULL
	OR "commencement_date" >= "incorporation_date"
);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_party_snapshot_chk" CHECK (
	("legal_party_id" IS NULL AND "legal_party_code_snapshot" IS NULL AND "legal_party_name_snapshot" IS NULL)
	OR ("legal_party_id" IS NOT NULL AND "legal_party_name_snapshot" IS NOT NULL AND length(btrim("legal_party_name_snapshot")) > 0)
);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_activation_pair_chk" CHECK (
	("activated_at" IS NULL AND "activated_by" IS NULL)
	OR ("activated_at" IS NOT NULL AND "activated_by" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_suspension_pair_chk" CHECK (
	("suspended_at" IS NULL AND "suspended_by" IS NULL)
	OR ("suspended_at" IS NOT NULL AND "suspended_by" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_dissolution_pair_chk" CHECK (
	("dissolved_at" IS NULL AND "dissolved_by" IS NULL)
	OR ("dissolved_at" IS NOT NULL AND "dissolved_by" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_archive_pair_chk" CHECK (
	("archived_at" IS NULL AND "archived_by" IS NULL)
	OR ("archived_at" IS NOT NULL AND "archived_by" IS NOT NULL)
);
--> statement-breakpoint

ALTER TABLE "ca_company_name" DROP CONSTRAINT IF EXISTS "ca_company_name_type_check";
--> statement-breakpoint
ALTER TABLE "ca_company_name" DROP CONSTRAINT IF EXISTS "ca_company_name_effective_dates_check";
--> statement-breakpoint
ALTER TABLE "ca_company_name" DROP CONSTRAINT IF EXISTS "ca_company_name_supersedes_id_ca_company_name_id_fk";
--> statement-breakpoint
ALTER TABLE "ca_company_name" DROP CONSTRAINT IF EXISTS "ca_company_name_legal_company_id_ca_legal_company_id_fk";
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD COLUMN IF NOT EXISTS "is_primary" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD COLUMN IF NOT EXISTS "correction_reason" text;
--> statement-breakpoint
ALTER TABLE "ca_company_name" RENAME COLUMN "supersedes_id" TO "supersedes_company_name_id";
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_supersedes_company_name_id_fk" FOREIGN KEY ("supersedes_company_name_id") REFERENCES "public"."ca_company_name"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
DROP INDEX IF EXISTS "ca_company_name_org_company_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "ca_company_name_org_company_type_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_name_org_company_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_name_org_company_effective_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","name_type","effective_from","effective_to");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_name_org_normalized_name_idx" ON "ca_company_name" USING btree ("organization_id","normalized_name");
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_type_chk" CHECK ("name_type" IN ('legal', 'former', 'trading'));
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_display_name_chk" CHECK (length(btrim("display_name")) > 0);
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_normalized_name_chk" CHECK (length(btrim("normalized_name")) > 0);
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_primary_chk" CHECK ("is_primary" IN (0, 1));
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_effective_range_chk" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from");
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_version_chk" CHECK ("version" >= 1);
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_supersession_chk" CHECK (
	"supersedes_company_name_id" IS NULL OR "supersedes_company_name_id" <> "id"
);
--> statement-breakpoint

ALTER TABLE "ca_company_identifier" DROP CONSTRAINT IF EXISTS "ca_company_identifier_status_check";
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" DROP CONSTRAINT IF EXISTS "ca_company_identifier_effective_dates_check";
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" DROP CONSTRAINT IF EXISTS "ca_company_identifier_legal_company_id_ca_legal_company_id_fk";
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD COLUMN IF NOT EXISTS "jurisdiction_country_id" uuid;
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD COLUMN IF NOT EXISTS "authority_party_id" uuid;
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD COLUMN IF NOT EXISTS "is_primary" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" RENAME COLUMN "normalized_value" TO "normalized_identifier_value";
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_authority_party_id_md_party_id_fk" FOREIGN KEY ("authority_party_id") REFERENCES "public"."md_party"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
DROP INDEX IF EXISTS "ca_company_identifier_org_company_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "ca_company_identifier_org_type_value_uidx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_identifier_org_company_idx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_identifier_org_company_effective_idx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id","identifier_type","effective_from","effective_to");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_identifier_org_authority_idx" ON "ca_company_identifier" USING btree ("organization_id","authority_party_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_identifier_org_type_value_uidx" ON "ca_company_identifier" USING btree ("organization_id","identifier_type","normalized_identifier_value");
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_type_chk" CHECK (length(btrim("identifier_type")) > 0);
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_value_chk" CHECK (length(btrim("identifier_value")) > 0);
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_normalized_value_chk" CHECK (length(btrim("normalized_identifier_value")) > 0);
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_primary_chk" CHECK ("is_primary" IN (0, 1));
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_status_chk" CHECK ("status" IN ('active', 'retired'));
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_effective_range_chk" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from");
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_version_chk" CHECK ("version" >= 1);
--> statement-breakpoint

ALTER TABLE "ca_company_status_history" DROP CONSTRAINT IF EXISTS "ca_company_status_history_legal_company_id_ca_legal_company_id_fk";
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" ADD CONSTRAINT "ca_company_status_history_legal_company_id_ca_legal_company_id_fk" FOREIGN KEY ("legal_company_id") REFERENCES "public"."ca_legal_company"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" ALTER COLUMN "effective_date" TYPE timestamp with time zone USING ("effective_date"::timestamp AT TIME ZONE 'UTC');
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" RENAME COLUMN "effective_date" TO "effective_at";
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" RENAME COLUMN "evidence_reference" TO "evidence_document_reference";
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" ADD COLUMN IF NOT EXISTS "reason_code" text;
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" ADD COLUMN IF NOT EXISTS "resolution_reference" text;
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" ADD COLUMN IF NOT EXISTS "causation_id" text;
--> statement-breakpoint
DROP INDEX IF EXISTS "ca_company_status_history_org_company_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_company_status_history_org_company_idx" ON "ca_company_status_history" USING btree ("organization_id","legal_company_id","effective_at","id");
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" ADD CONSTRAINT "ca_company_status_history_from_status_chk" CHECK (
	"from_status" IS NULL
	OR "from_status" IN ('draft', 'active', 'suspended', 'dissolved', 'archived')
);
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" ADD CONSTRAINT "ca_company_status_history_to_status_chk" CHECK (
	"to_status" IN ('draft', 'active', 'suspended', 'dissolved', 'archived')
);
--> statement-breakpoint
ALTER TABLE "ca_company_status_history" ADD CONSTRAINT "ca_company_status_history_transition_chk" CHECK (
	"from_status" IS NULL OR "from_status" <> "to_status"
);
