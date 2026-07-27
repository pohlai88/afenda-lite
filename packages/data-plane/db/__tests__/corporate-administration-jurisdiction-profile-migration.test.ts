import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"ca_company_jurisdiction_profile",
	"ca_legal_company",
]);

describe("Corporate Administration jurisdiction profile lineage migration", () => {
	it("is additive and targets only CA-1.1 jurisdiction profile lineage", () => {
		const additive = assertAdditiveMigrationSql(migrationSql);
		expect(additive.ok).toBe(true);
		expect(migrationSql).toContain(
			'ALTER TABLE "ca_company_jurisdiction_profile"',
		);
		expect(migrationSql).toContain('ALTER TABLE "ca_legal_company"');
		expect(migrationSql).not.toContain('CREATE TABLE "ca_legal_establishment"');
		expect(migrationSql).not.toContain("approval");
		expect(migrationSql).not.toContain("payment");
	});

	it("defines reproducible knownAt lineage and optional source facts", () => {
		for (const column of [
			'"recorded_from" timestamp with time zone',
			'"recorded_to" timestamp with time zone',
			'"supersedes_id" uuid',
			'"correction_reason" text',
			'"source_document_id" text',
			'"regulator_code" text',
			'"compliance_profile_code" text',
		]) {
			expect(migrationSql).toContain(column);
		}
		expect(migrationSql).toContain(
			'"recorded_from" timestamp with time zone NOT NULL',
		);
	});

	it("enforces same-tenant company and predecessor ownership", () => {
		expect(migrationSql).toContain('UNIQUE ("organization_id", "id")');
		expect(migrationSql).toContain(
			'FOREIGN KEY ("organization_id", "legal_company_id")',
		);
		expect(migrationSql).toContain(
			'FOREIGN KEY ("organization_id", "legal_company_id", "supersedes_id")',
		);
		expect(migrationSql).toContain(
			'"ca_company_jurisdiction_profile_supersedes_self_check"',
		);
	});

	it("adds lookup support for asOf and knownAt resolution", () => {
		expect(migrationSql).toContain(
			'CREATE INDEX "ca_company_jurisdiction_profile_known_at_idx"',
		);
		expect(migrationSql).toContain('"effective_from"');
		expect(migrationSql).toContain('"effective_to"');
		expect(migrationSql).toContain('"recorded_from"');
		expect(migrationSql).toContain('"recorded_to"');
	});
});
