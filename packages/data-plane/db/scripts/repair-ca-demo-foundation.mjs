/**
 * Operator repair for the CA-0.4 demo branch only.
 *
 * The branch can contain later CA-1.4 establishment tables while missing the
 * earlier CA company foundation history tables that live in the historical
 * 0000 baseline. Normal db:migrate must stay blocked for this shape because
 * 0000 is CREATE DDL for an empty public schema.
 *
 * Required gates:
 *   AFENDA_ALLOW_DB_MIGRATE=1
 *   AFENDA_ALLOW_CA_FOUNDATION_REPAIR=1
 *   AFENDA_DATABASE_TEST_TARGET=demo
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import { requireMigrationDatabaseUrl } from "./lib/database-url.mjs";
import { loadEnvLocal } from "./lib/migration-journal-rows.mjs";
import { runSequentially } from "./lib/run-sequentially.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "../../..");

const anchorTables = [
	"ca_legal_company",
	"ca_company_jurisdiction_profile",
	"ca_legal_establishment",
	"ca_establishment_status_history",
	"ca_registered_address",
	"ca_premise",
];

const foundationTables = [
	"ca_company_activity",
	"ca_company_financial_year",
	"ca_company_identifier",
	"ca_company_legal_form_history",
	"ca_company_name",
];

const recordedRangeRepairStatements = [
	`ALTER TABLE "ca_company_jurisdiction_profile" DROP CONSTRAINT IF EXISTS "ca_company_jurisdiction_profile_recorded_range_check"`,
	`ALTER TABLE "ca_company_jurisdiction_profile" ADD CONSTRAINT "ca_company_jurisdiction_profile_recorded_range_check" CHECK ("ca_company_jurisdiction_profile"."recorded_to" IS NULL OR "ca_company_jurisdiction_profile"."recorded_from" <= "ca_company_jurisdiction_profile"."recorded_to")`,
	`ALTER TABLE "ca_company_name" DROP CONSTRAINT IF EXISTS "ca_company_name_recorded_range_check"`,
	`ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_recorded_range_check" CHECK ("ca_company_name"."recorded_to" IS NULL OR "ca_company_name"."recorded_from" <= "ca_company_name"."recorded_to")`,
	`ALTER TABLE "ca_company_legal_form_history" DROP CONSTRAINT IF EXISTS "ca_company_legal_form_recorded_range_check"`,
	`ALTER TABLE "ca_company_legal_form_history" ADD CONSTRAINT "ca_company_legal_form_recorded_range_check" CHECK ("ca_company_legal_form_history"."recorded_to" IS NULL OR "ca_company_legal_form_history"."recorded_from" <= "ca_company_legal_form_history"."recorded_to")`,
	`ALTER TABLE "ca_company_identifier" DROP CONSTRAINT IF EXISTS "ca_company_identifier_recorded_range_check"`,
	`ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_recorded_range_check" CHECK ("ca_company_identifier"."recorded_to" IS NULL OR "ca_company_identifier"."recorded_from" <= "ca_company_identifier"."recorded_to")`,
	`ALTER TABLE "ca_company_financial_year" DROP CONSTRAINT IF EXISTS "ca_company_financial_year_recorded_range_check"`,
	`ALTER TABLE "ca_company_financial_year" ADD CONSTRAINT "ca_company_financial_year_recorded_range_check" CHECK ("ca_company_financial_year"."recorded_to" IS NULL OR "ca_company_financial_year"."recorded_from" <= "ca_company_financial_year"."recorded_to")`,
	`ALTER TABLE "ca_company_activity" DROP CONSTRAINT IF EXISTS "ca_company_activity_recorded_range_check"`,
	`ALTER TABLE "ca_company_activity" ADD CONSTRAINT "ca_company_activity_recorded_range_check" CHECK ("ca_company_activity"."recorded_to" IS NULL OR "ca_company_activity"."recorded_from" <= "ca_company_activity"."recorded_to")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_identifier_supersedes_once_uidx" ON "ca_company_identifier" ("organization_id", "legal_company_id", "supersedes_id") WHERE "supersedes_id" IS NOT NULL`,
];

loadEnvLocal(repoRoot);

if (process.env.AFENDA_ALLOW_DB_MIGRATE !== "1") {
	console.error(
		"repair-ca-demo-foundation DENIED: set AFENDA_ALLOW_DB_MIGRATE=1.",
	);
	process.exit(1);
}

if (process.env.AFENDA_ALLOW_CA_FOUNDATION_REPAIR !== "1") {
	console.error(
		"repair-ca-demo-foundation DENIED: set AFENDA_ALLOW_CA_FOUNDATION_REPAIR=1.",
	);
	process.exit(1);
}

if (process.env.AFENDA_DATABASE_TEST_TARGET !== "demo") {
	console.error(
		"repair-ca-demo-foundation DENIED: AFENDA_DATABASE_TEST_TARGET must be demo.",
	);
	process.exit(1);
}

let databaseUrl;
try {
	databaseUrl = requireMigrationDatabaseUrl(process.env);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`repair-ca-demo-foundation DENIED: ${message}`);
	process.exit(1);
}

const sql = neon(databaseUrl);

async function existingTables(tableNames) {
	const rows = await sql`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = ANY(${tableNames})
	`;
	return new Set(rows.map((row) => row.table_name));
}

function deny(message) {
	console.error(`repair-ca-demo-foundation DENIED: ${message}`);
	process.exit(1);
}

const currentTables = await existingTables([
	...anchorTables,
	...foundationTables,
]);
const missingAnchors = anchorTables.filter(
	(table) => !currentTables.has(table),
);
if (missingAnchors.length > 0) {
	deny(`missing anchor table(s): ${missingAnchors.join(", ")}`);
}

const missingFoundation = foundationTables.filter(
	(table) => !currentTables.has(table),
);
if (missingFoundation.length === 0) {
	await runSequentially(recordedRangeRepairStatements, (statement) =>
		sql.query(statement),
	);
	console.log(
		"repair-ca-demo-foundation: CA foundation tables already present; recorded-range invariants repaired",
	);
	process.exit(0);
}

if (missingFoundation.length !== foundationTables.length) {
	deny(
		`partial foundation state requires manual DB review; missing: ${missingFoundation.join(", ")}`,
	);
}

const statements = [
	"CREATE EXTENSION IF NOT EXISTS btree_gist",
	`DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'ca_legal_company_org_id_unique'
	) THEN
		ALTER TABLE "ca_legal_company"
			ADD CONSTRAINT "ca_legal_company_org_id_unique"
			UNIQUE ("organization_id", "id");
	END IF;
END $$`,
	`CREATE TABLE "ca_company_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"classification_system" text DEFAULT 'registered_activity' NOT NULL,
	"activity_code" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"regulator_code" text,
	"description" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_activity_classification_check" CHECK ("ca_company_activity"."activity_type" IN ('registered_object', 'regulated', 'operational')),
	CONSTRAINT "ca_company_activity_classification_system_check" CHECK (char_length(btrim("ca_company_activity"."classification_system")) > 0),
	CONSTRAINT "ca_company_activity_regulator_check" CHECK ("ca_company_activity"."activity_type" <> 'regulated' OR "ca_company_activity"."regulator_code" IS NOT NULL),
	CONSTRAINT "ca_company_activity_jurisdiction_check" CHECK ("ca_company_activity"."jurisdiction_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_company_activity_code_check" CHECK ("ca_company_activity"."activity_code" ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$'),
	CONSTRAINT "ca_company_activity_description_check" CHECK (char_length(btrim("ca_company_activity"."description")) > 0),
	CONSTRAINT "ca_company_activity_effective_range_check" CHECK ("ca_company_activity"."effective_to" IS NULL OR "ca_company_activity"."effective_from" < "ca_company_activity"."effective_to"),
	CONSTRAINT "ca_company_activity_recorded_range_check" CHECK ("ca_company_activity"."recorded_to" IS NULL OR "ca_company_activity"."recorded_from" <= "ca_company_activity"."recorded_to"),
	CONSTRAINT "ca_company_activity_status_check" CHECK ("ca_company_activity"."status" IN ('active', 'ended')),
	CONSTRAINT "ca_company_activity_version_check" CHECK ("ca_company_activity"."version" > 0)
)`,
	`CREATE TABLE "ca_company_financial_year" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"year_end_month" integer NOT NULL,
	"year_end_day" integer NOT NULL,
	"calendar_type" text DEFAULT 'gregorian' NOT NULL,
	"functional_currency_code" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"correction_reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_financial_year_start_check" CHECK ("ca_company_financial_year"."year_end_month" BETWEEN 1 AND 12 AND "ca_company_financial_year"."year_end_day" BETWEEN 1 AND 31),
	CONSTRAINT "ca_company_financial_year_calendar_check" CHECK ("ca_company_financial_year"."calendar_type" IN ('gregorian')),
	CONSTRAINT "ca_company_financial_year_currency_check" CHECK ("ca_company_financial_year"."functional_currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "ca_company_financial_year_effective_range_check" CHECK ("ca_company_financial_year"."effective_to" IS NULL OR "ca_company_financial_year"."effective_from" < "ca_company_financial_year"."effective_to"),
	CONSTRAINT "ca_company_financial_year_recorded_range_check" CHECK ("ca_company_financial_year"."recorded_to" IS NULL OR "ca_company_financial_year"."recorded_from" <= "ca_company_financial_year"."recorded_to"),
	CONSTRAINT "ca_company_financial_year_status_check" CHECK ("ca_company_financial_year"."status" IN ('active')),
	CONSTRAINT "ca_company_financial_year_version_check" CHECK ("ca_company_financial_year"."version" > 0)
)`,
	`CREATE TABLE "ca_company_identifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"identifier_type" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"authority_code" text NOT NULL,
	"display_value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"uniqueness_scope" text DEFAULT 'tenant_authority' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"correction_reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"supersedes_id" uuid,
	"superseded_at" timestamp with time zone,
	"superseded_by_identifier_id" uuid,
	"retired_at" timestamp with time zone,
	"retirement_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_identifier_type_check" CHECK ("ca_company_identifier"."identifier_type" IN ('company_registration', 'registry_number', 'business_registration', 'foreign_registration', 'legal_entity_identifier', 'statistical_identifier', 'industry_identifier', 'other_non_tax_identifier')),
	CONSTRAINT "ca_company_identifier_not_tax_check" CHECK ("ca_company_identifier"."identifier_type" !~* '(tax|vat|gst|sst|tin)'),
	CONSTRAINT "ca_company_identifier_jurisdiction_check" CHECK ("ca_company_identifier"."jurisdiction_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_company_identifier_value_check" CHECK (char_length(btrim("ca_company_identifier"."display_value")) > 0 AND char_length(btrim("ca_company_identifier"."normalized_value")) > 0),
	CONSTRAINT "ca_company_identifier_uniqueness_scope_check" CHECK ("ca_company_identifier"."uniqueness_scope" IN ('global_authority', 'tenant_authority', 'company_authority')),
	CONSTRAINT "ca_company_identifier_effective_range_check" CHECK ("ca_company_identifier"."effective_to" IS NULL OR "ca_company_identifier"."effective_from" < "ca_company_identifier"."effective_to"),
	CONSTRAINT "ca_company_identifier_recorded_range_check" CHECK ("ca_company_identifier"."recorded_to" IS NULL OR "ca_company_identifier"."recorded_from" <= "ca_company_identifier"."recorded_to"),
	CONSTRAINT "ca_company_identifier_status_check" CHECK ("ca_company_identifier"."status" IN ('active', 'superseded', 'retired')),
	CONSTRAINT "ca_company_identifier_supersedes_self_check" CHECK ("ca_company_identifier"."supersedes_id" IS NULL OR "ca_company_identifier"."supersedes_id" <> "ca_company_identifier"."id"),
	CONSTRAINT "ca_company_identifier_version_check" CHECK ("ca_company_identifier"."version" > 0)
)`,
	`CREATE TABLE "ca_company_legal_form_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"legal_form_code" text NOT NULL,
	"entity_type_code" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_document_id" text,
	"correction_reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"supersedes_id" uuid,
	"superseded_at" timestamp with time zone,
	"superseded_by_legal_form_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_legal_form_jurisdiction_check" CHECK ("ca_company_legal_form_history"."jurisdiction_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_company_legal_form_code_check" CHECK ("ca_company_legal_form_history"."legal_form_code" ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$' AND "ca_company_legal_form_history"."entity_type_code" ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$'),
	CONSTRAINT "ca_company_legal_form_effective_range_check" CHECK ("ca_company_legal_form_history"."effective_to" IS NULL OR "ca_company_legal_form_history"."effective_from" < "ca_company_legal_form_history"."effective_to"),
	CONSTRAINT "ca_company_legal_form_recorded_range_check" CHECK ("ca_company_legal_form_history"."recorded_to" IS NULL OR "ca_company_legal_form_history"."recorded_from" <= "ca_company_legal_form_history"."recorded_to"),
	CONSTRAINT "ca_company_legal_form_status_check" CHECK ("ca_company_legal_form_history"."status" IN ('active', 'superseded')),
	CONSTRAINT "ca_company_legal_form_supersedes_self_check" CHECK ("ca_company_legal_form_history"."supersedes_id" IS NULL OR "ca_company_legal_form_history"."supersedes_id" <> "ca_company_legal_form_history"."id"),
	CONSTRAINT "ca_company_legal_form_supersession_check" CHECK (("ca_company_legal_form_history"."status" = 'superseded' AND "ca_company_legal_form_history"."superseded_at" IS NOT NULL AND "ca_company_legal_form_history"."superseded_by_legal_form_id" IS NOT NULL) OR ("ca_company_legal_form_history"."status" <> 'superseded')),
	CONSTRAINT "ca_company_legal_form_version_check" CHECK ("ca_company_legal_form_history"."version" > 0)
)`,
	`CREATE TABLE "ca_company_name" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"name_type" text NOT NULL,
	"language_code" text NOT NULL,
	"display_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_document_id" text,
	"correction_reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"supersedes_id" uuid,
	"superseded_at" timestamp with time zone,
	"superseded_by_name_id" uuid,
	"retired_at" timestamp with time zone,
	"retirement_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_name_type_check" CHECK ("ca_company_name"."name_type" IN ('legal', 'former', 'translated', 'trading')),
	CONSTRAINT "ca_company_name_language_check" CHECK ("ca_company_name"."language_code" ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
	CONSTRAINT "ca_company_name_display_check" CHECK (char_length(btrim("ca_company_name"."display_name")) > 0 AND char_length(btrim("ca_company_name"."normalized_name")) > 0),
	CONSTRAINT "ca_company_name_effective_range_check" CHECK ("ca_company_name"."effective_to" IS NULL OR "ca_company_name"."effective_from" < "ca_company_name"."effective_to"),
	CONSTRAINT "ca_company_name_recorded_range_check" CHECK ("ca_company_name"."recorded_to" IS NULL OR "ca_company_name"."recorded_from" <= "ca_company_name"."recorded_to"),
	CONSTRAINT "ca_company_name_status_check" CHECK ("ca_company_name"."status" IN ('active', 'superseded', 'retired')),
	CONSTRAINT "ca_company_name_supersedes_self_check" CHECK ("ca_company_name"."supersedes_id" IS NULL OR "ca_company_name"."supersedes_id" <> "ca_company_name"."id"),
	CONSTRAINT "ca_company_name_supersession_check" CHECK (("ca_company_name"."status" = 'superseded' AND "ca_company_name"."superseded_at" IS NOT NULL AND "ca_company_name"."superseded_by_name_id" IS NOT NULL) OR ("ca_company_name"."status" <> 'superseded')),
	CONSTRAINT "ca_company_name_retirement_check" CHECK (("ca_company_name"."status" = 'retired' AND "ca_company_name"."retired_at" IS NOT NULL AND "ca_company_name"."retirement_reason" IS NOT NULL) OR ("ca_company_name"."status" <> 'retired')),
	CONSTRAINT "ca_company_name_version_check" CHECK ("ca_company_name"."version" > 0)
)`,
	`CREATE INDEX IF NOT EXISTS "ca_company_activity_company_idx" ON "ca_company_activity" USING btree ("organization_id","legal_company_id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_activity_as_of_idx" ON "ca_company_activity" USING btree ("organization_id","legal_company_id","activity_type","classification_system","jurisdiction_code","effective_from","effective_to")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_activity_known_at_idx" ON "ca_company_activity" USING btree ("organization_id","legal_company_id","effective_from","effective_to","recorded_from","recorded_to")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_activity_org_company_id_uidx" ON "ca_company_activity" USING btree ("organization_id","legal_company_id","id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_financial_year_company_idx" ON "ca_company_financial_year" USING btree ("organization_id","legal_company_id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_financial_year_effective_idx" ON "ca_company_financial_year" USING btree ("organization_id","legal_company_id","effective_from","effective_to")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_financial_year_known_at_idx" ON "ca_company_financial_year" USING btree ("organization_id","legal_company_id","effective_from","effective_to","recorded_from","recorded_to")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_financial_year_org_company_id_uidx" ON "ca_company_financial_year" USING btree ("organization_id","legal_company_id","id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_identifier_company_idx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_identifier_scope_effective_idx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id","identifier_type","jurisdiction_code","authority_code","normalized_value","effective_from","effective_to")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_identifier_known_at_idx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id","identifier_type","jurisdiction_code","effective_from","effective_to","recorded_from","recorded_to")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_identifier_recorded_at_idx" ON "ca_company_identifier" USING btree ("recorded_at")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_identifier_supersedes_idx" ON "ca_company_identifier" USING btree ("supersedes_id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_identifier_type_authority_idx" ON "ca_company_identifier" USING btree ("identifier_type","jurisdiction_code","authority_code")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_identifier_normalized_value_idx" ON "ca_company_identifier" USING btree ("normalized_value")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_identifier_org_company_id_uidx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id","id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_legal_form_company_idx" ON "ca_company_legal_form_history" USING btree ("organization_id","legal_company_id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_legal_form_effective_idx" ON "ca_company_legal_form_history" USING btree ("organization_id","legal_company_id","effective_from","effective_to")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_legal_form_effective_from_idx" ON "ca_company_legal_form_history" USING btree ("organization_id","legal_company_id","effective_from")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_legal_form_jurisdiction_form_idx" ON "ca_company_legal_form_history" USING btree ("organization_id","jurisdiction_code","legal_form_code")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_legal_form_recorded_at_idx" ON "ca_company_legal_form_history" USING btree ("recorded_at")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_legal_form_supersedes_idx" ON "ca_company_legal_form_history" USING btree ("supersedes_id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_legal_form_known_at_idx" ON "ca_company_legal_form_history" USING btree ("organization_id","legal_company_id","effective_from","effective_to","recorded_from","recorded_to")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_legal_form_org_company_id_uidx" ON "ca_company_legal_form_history" USING btree ("organization_id","legal_company_id","id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_name_company_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_name_scope_effective_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","name_type","language_code","effective_from","effective_to")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_name_scope_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","name_type","language_code")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_name_effective_from_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","effective_from")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_name_normalized_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","name_type","language_code","normalized_name")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_name_normalized_name_idx" ON "ca_company_name" USING btree ("normalized_name")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_name_recorded_at_idx" ON "ca_company_name" USING btree ("recorded_at")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_name_supersedes_idx" ON "ca_company_name" USING btree ("supersedes_id")`,
	`CREATE INDEX IF NOT EXISTS "ca_company_name_known_at_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","name_type","language_code","effective_from","effective_to","recorded_from","recorded_to")`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_name_org_company_id_uidx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","id")`,
	`ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_company_fk" FOREIGN KEY ("organization_id", "legal_company_id") REFERENCES "ca_legal_company" ("organization_id", "id")`,
	`ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_supersedes_same_company_fk" FOREIGN KEY ("organization_id", "legal_company_id", "supersedes_id") REFERENCES "ca_company_name" ("organization_id", "legal_company_id", "id")`,
	`ALTER TABLE "ca_company_legal_form_history" ADD CONSTRAINT "ca_company_legal_form_company_fk" FOREIGN KEY ("organization_id", "legal_company_id") REFERENCES "ca_legal_company" ("organization_id", "id")`,
	`ALTER TABLE "ca_company_legal_form_history" ADD CONSTRAINT "ca_company_legal_form_supersedes_same_company_fk" FOREIGN KEY ("organization_id", "legal_company_id", "supersedes_id") REFERENCES "ca_company_legal_form_history" ("organization_id", "legal_company_id", "id")`,
	`ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_no_overlap_excl" EXCLUDE USING gist ("organization_id" WITH =, "legal_company_id" WITH =, "name_type" WITH =, "language_code" WITH =, daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&) WHERE ("status" = 'active')`,
	`ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_duplicate_overlap_excl" EXCLUDE USING gist ("organization_id" WITH =, "legal_company_id" WITH =, "name_type" WITH =, "language_code" WITH =, "normalized_name" WITH =, daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&) WHERE ("status" = 'active')`,
	`ALTER TABLE "ca_company_legal_form_history" ADD CONSTRAINT "ca_company_legal_form_no_overlap_excl" EXCLUDE USING gist ("organization_id" WITH =, "legal_company_id" WITH =, daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&) WHERE ("status" = 'active')`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_identifier_tenant_authority_open_uidx" ON "ca_company_identifier" ("organization_id","identifier_type","jurisdiction_code","authority_code","normalized_value") WHERE "status" = 'active' AND "effective_to" IS NULL AND "uniqueness_scope" IN ('global_authority', 'tenant_authority')`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_identifier_company_authority_open_uidx" ON "ca_company_identifier" ("organization_id","legal_company_id","identifier_type","jurisdiction_code","authority_code","normalized_value") WHERE "status" = 'active' AND "effective_to" IS NULL AND "uniqueness_scope" = 'company_authority'`,
	`ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_tenant_authority_no_overlap_excl" EXCLUDE USING gist ("organization_id" WITH =, "identifier_type" WITH =, "jurisdiction_code" WITH =, "authority_code" WITH =, "normalized_value" WITH =, daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&) WHERE ("status" = 'active' AND "uniqueness_scope" IN ('global_authority', 'tenant_authority'))`,
	`ALTER TABLE "ca_company_identifier" ADD CONSTRAINT "ca_company_identifier_company_authority_no_overlap_excl" EXCLUDE USING gist ("organization_id" WITH =, "legal_company_id" WITH =, "identifier_type" WITH =, "jurisdiction_code" WITH =, "authority_code" WITH =, "normalized_value" WITH =, daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&) WHERE ("status" = 'active' AND "uniqueness_scope" = 'company_authority')`,
	`ALTER TABLE "ca_company_financial_year" ADD CONSTRAINT "ca_company_financial_year_no_overlap_excl" EXCLUDE USING gist ("organization_id" WITH =, "legal_company_id" WITH =, daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&) WHERE ("status" = 'active')`,
	`ALTER TABLE "ca_company_activity" ADD CONSTRAINT "ca_company_activity_no_overlap_excl" EXCLUDE USING gist ("organization_id" WITH =, "legal_company_id" WITH =, "activity_type" WITH =, "classification_system" WITH =, "activity_code" WITH =, "jurisdiction_code" WITH =, daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&) WHERE ("status" = 'active')`,
];

await runSequentially(statements, (statement) => sql.query(statement));

console.log(
	`repair-ca-demo-foundation: created ${foundationTables.length} CA foundation tables and invariants`,
);
