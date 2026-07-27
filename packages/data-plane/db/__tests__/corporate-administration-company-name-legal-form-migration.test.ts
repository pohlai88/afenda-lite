import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables(
	["ca_company_name", "ca_company_legal_form_history"],
	{ includeExtensions: true },
);

describe("Corporate Administration company name and legal form migration", () => {
	it("is additive and creates only CA-1.2 history tables", () => {
		const additive = assertAdditiveMigrationSql(migrationSql);
		expect(additive.ok).toBe(true);
		expect(migrationSql).toContain('CREATE TABLE "ca_company_name"');
		expect(migrationSql).toContain(
			'CREATE TABLE "ca_company_legal_form_history"',
		);
		expect(migrationSql).not.toContain("legal_establishment");
		expect(migrationSql).not.toContain("UPDATE md_party");
	});

	it("defines the required company-name facts and constraints", () => {
		for (const column of [
			'"organization_id" text NOT NULL',
			'"legal_company_id" uuid NOT NULL',
			'"name_type" text NOT NULL',
			'"language_code" text NOT NULL',
			'"display_name" text NOT NULL',
			'"normalized_name" text NOT NULL',
			'"effective_from" date NOT NULL',
			'"effective_to" date',
			'"recorded_at" timestamp with time zone NOT NULL',
			'"recorded_by" text NOT NULL',
			'"supersedes_id" uuid',
			'"correction_reason" text',
			'"source_document_id" text',
			'"created_at" timestamp with time zone DEFAULT now() NOT NULL',
		]) {
			expect(migrationSql).toContain(column);
		}
		expect(migrationSql).toContain('"ca_company_name_effective_range_check"');
		expect(migrationSql).toContain('"ca_company_name_display_check"');
		expect(migrationSql).toContain('"ca_company_name_language_check"');
		expect(migrationSql).toContain('"ca_company_name_supersedes_self_check"');
	});

	it("defines the required legal-form facts and constraints", () => {
		for (const column of [
			'"jurisdiction_code" text NOT NULL',
			'"entity_type_code" text NOT NULL',
			'"legal_form_code" text NOT NULL',
			'"effective_from" date NOT NULL',
			'"effective_to" date',
			'"recorded_at" timestamp with time zone NOT NULL',
			'"recorded_by" text NOT NULL',
			'"supersedes_id" uuid',
			'"correction_reason" text',
			'"source_document_id" text',
			'"created_at" timestamp with time zone DEFAULT now() NOT NULL',
		]) {
			expect(migrationSql).toContain(column);
		}
		expect(migrationSql).toContain(
			'"ca_company_legal_form_effective_range_check"',
		);
		expect(migrationSql).toContain(
			'"ca_company_legal_form_supersedes_self_check"',
		);
	});

	it("adds required lookup and lineage indexes", () => {
		for (const indexName of [
			"ca_company_name_company_idx",
			"ca_company_name_scope_idx",
			"ca_company_name_effective_from_idx",
			"ca_company_name_normalized_name_idx",
			"ca_company_name_recorded_at_idx",
			"ca_company_name_supersedes_idx",
			"ca_company_legal_form_company_idx",
			"ca_company_legal_form_effective_from_idx",
			"ca_company_legal_form_jurisdiction_form_idx",
			"ca_company_legal_form_recorded_at_idx",
			"ca_company_legal_form_supersedes_idx",
		]) {
			expect(migrationSql).toContain(`CREATE INDEX "${indexName}"`);
		}
	});

	it("enforces tenant ownership and PostgreSQL non-overlap", () => {
		expect(migrationSql).toContain(
			'FOREIGN KEY ("organization_id", "legal_company_id")',
		);
		expect(migrationSql).toContain("CREATE EXTENSION IF NOT EXISTS btree_gist");
		expect(migrationSql).toContain('"ca_company_name_no_overlap_excl"');
		expect(migrationSql).toContain(
			'"name_type" WITH =,\n\t\t"language_code" WITH =',
		);
		expect(migrationSql).toContain('"ca_company_legal_form_no_overlap_excl"');
		expect(migrationSql).toContain(
			"daterange(\"effective_from\", COALESCE(\"effective_to\", 'infinity'::date), '[)') WITH &&",
		);
	});
});
