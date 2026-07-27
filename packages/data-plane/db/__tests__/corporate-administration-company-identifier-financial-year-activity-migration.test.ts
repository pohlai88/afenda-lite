import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables(
	["ca_company_identifier", "ca_company_financial_year", "ca_company_activity"],
	{ includeExtensions: true },
);

describe("Corporate Administration identifier, financial year and activity migration", () => {
	it("is additive and creates only CA-1.3 company tables", () => {
		const additive = assertAdditiveMigrationSql(migrationSql);
		expect(additive.ok).toBe(true);
		expect(migrationSql).toContain('CREATE TABLE "ca_company_identifier"');
		expect(migrationSql).toContain('CREATE TABLE "ca_company_financial_year"');
		expect(migrationSql).toContain('CREATE TABLE "ca_company_activity"');
		expect(migrationSql).not.toContain("legal_establishment");
		expect(migrationSql).not.toContain("md_tax_registration");
	});

	it("defines non-tax company identifier facts and indexes", () => {
		for (const column of [
			'"organization_id" text NOT NULL',
			'"legal_company_id" uuid NOT NULL',
			'"identifier_type" text NOT NULL',
			'"jurisdiction_code" text NOT NULL',
			'"authority_code" text NOT NULL',
			'"display_value" text NOT NULL',
			'"normalized_value" text NOT NULL',
			"\"uniqueness_scope\" text DEFAULT 'tenant_authority' NOT NULL",
			'"effective_from" date NOT NULL',
			'"effective_to" date',
			'"recorded_at" timestamp with time zone NOT NULL',
			'"recorded_by" text NOT NULL',
			'"supersedes_id" uuid',
			'"correction_reason" text',
			'"source_document_id" text NOT NULL',
			'"created_at" timestamp with time zone DEFAULT now() NOT NULL',
		]) {
			expect(migrationSql).toContain(column);
		}
		expect(migrationSql).toContain('"ca_company_identifier_not_tax_check"');
		expect(migrationSql).toContain(
			'"ca_company_identifier_uniqueness_scope_check"',
		);
		expect(migrationSql).toContain("ca_company_identifier_type_authority_idx");
		expect(migrationSql).toContain(
			"ca_company_identifier_normalized_value_idx",
		);
		expect(migrationSql).toContain(
			"ca_company_identifier_tenant_authority_open_uidx",
		);
		expect(migrationSql).toContain(
			"ca_company_identifier_company_authority_open_uidx",
		);
	});

	it("defines financial-year facts using year-end terminology", () => {
		for (const column of [
			'"year_end_month" integer NOT NULL',
			'"year_end_day" integer NOT NULL',
			"\"calendar_type\" text DEFAULT 'gregorian' NOT NULL",
			'"functional_currency_code" text NOT NULL',
			'"effective_from" date NOT NULL',
			'"effective_to" date',
			'"recorded_at" timestamp with time zone NOT NULL',
			'"recorded_by" text NOT NULL',
			'"source_document_id" text NOT NULL',
		]) {
			expect(migrationSql).toContain(column);
		}
		expect(migrationSql).toContain('"ca_company_financial_year_start_check"');
		expect(migrationSql).toContain(
			'"ca_company_financial_year_calendar_check"',
		);
		expect(migrationSql).toContain(
			'"ca_company_financial_year_currency_check"',
		);
	});

	it("defines activity facts with distinct activity type and classification system", () => {
		for (const column of [
			'"activity_type" text NOT NULL',
			"\"classification_system\" text DEFAULT 'registered_activity' NOT NULL",
			'"activity_code" text NOT NULL',
			'"description" text NOT NULL',
			'"jurisdiction_code" text NOT NULL',
			'"regulator_code" text',
			'"is_primary" boolean DEFAULT false NOT NULL',
			'"effective_from" date NOT NULL',
			'"effective_to" date',
			'"recorded_at" timestamp with time zone NOT NULL',
			'"recorded_by" text NOT NULL',
			'"source_document_id" text NOT NULL',
		]) {
			expect(migrationSql).toContain(column);
		}
		expect(migrationSql).toContain(
			'"ca_company_activity_classification_check"',
		);
		expect(migrationSql).toContain(
			'"ca_company_activity_classification_system_check"',
		);
		expect(migrationSql).toContain('"ca_company_activity_regulator_check"');
		expect(migrationSql).toContain(
			'"activity_type","classification_system","jurisdiction_code"',
		);
	});

	it("enforces effective-period uniqueness and non-overlap in PostgreSQL", () => {
		expect(migrationSql).toContain("CREATE EXTENSION IF NOT EXISTS btree_gist");
		expect(migrationSql).toContain(
			'"ca_company_identifier_tenant_authority_no_overlap_excl"',
		);
		expect(migrationSql).toContain(
			'"ca_company_identifier_company_authority_no_overlap_excl"',
		);
		expect(migrationSql).toContain(
			'"ca_company_financial_year_no_overlap_excl"',
		);
		expect(migrationSql).toContain('"ca_company_activity_no_overlap_excl"');
		expect(migrationSql).toContain(
			'"identifier_type" WITH =,\n\t\t"jurisdiction_code" WITH =,\n\t\t"authority_code" WITH =,\n\t\t"normalized_value" WITH =',
		);
		expect(migrationSql).toContain(
			'"organization_id" WITH =,\n\t\t"legal_company_id" WITH =,\n\t\tdaterange("effective_from", COALESCE("effective_to", \'infinity\'::date), \'[)\') WITH &&',
		);
		expect(migrationSql).toContain(
			'"activity_type" WITH =,\n\t\t"classification_system" WITH =,\n\t\t"activity_code" WITH =,\n\t\t"jurisdiction_code" WITH =',
		);
		expect(migrationSql).toContain(
			"daterange(\"effective_from\", COALESCE(\"effective_to\", 'infinity'::date), '[)') WITH &&",
		);
	});
});
