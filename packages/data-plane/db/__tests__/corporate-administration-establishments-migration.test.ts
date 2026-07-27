import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"ca_legal_establishment",
	"ca_establishment_status_history",
	"ca_registered_address",
	"ca_premise",
]);

describe("Corporate Administration CA-1.4 migration", () => {
	it("is additive and creates exactly the establishment authority tables", () => {
		expect(assertAdditiveMigrationSql(migrationSql).ok).toBe(true);
		for (const table of [
			"ca_legal_establishment",
			"ca_establishment_status_history",
			"ca_registered_address",
			"ca_premise",
		]) {
			expect(migrationSql).toContain(`CREATE TABLE "${table}"`);
		}
		expect(migrationSql).not.toContain('md_party_address" SET');
	});

	it("enforces tenant-coherent parentage and natural-key uniqueness", () => {
		expect(migrationSql).toContain('"ca_legal_establishment_company_fk"');
		expect(migrationSql).toContain(
			'FOREIGN KEY ("organization_id", "legal_company_id")',
		);
		expect(migrationSql).toContain(
			'FOREIGN KEY ("organization_id", "legal_company_id", "legal_establishment_id")',
		);
		expect(migrationSql).toContain('"ca_legal_establishment_natural_key_uidx"');
	});

	it("enforces non-overlapping status and statutory address history", () => {
		expect(migrationSql).toContain('"ca_establishment_status_version_uidx"');
		expect(migrationSql).toContain('"ca_establishment_status_no_overlap_excl"');
		expect(migrationSql).toContain('"ca_registered_address_no_overlap_excl"');
		expect(migrationSql).toContain('daterange("effective_from"');
		expect(migrationSql).toContain('"address_scope_key" WITH =');
	});

	it("stores address snapshots without foreign-table mutation authority", () => {
		for (const column of [
			'"source_party_address_id" uuid NOT NULL',
			'"line_1" text NOT NULL',
			'"city" text NOT NULL',
			'"country_code" text NOT NULL',
			'"effective_from" date NOT NULL',
			'"recorded_at" timestamp with time zone NOT NULL',
		]) {
			expect(migrationSql).toContain(column);
		}
		expect(migrationSql).not.toContain('UPDATE "md_party_address"');
	});
});
