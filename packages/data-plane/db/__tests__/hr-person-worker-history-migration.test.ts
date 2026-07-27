import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"hr_person_identity_version",
	"hr_worker_classification_version",
]);

describe("HR person and worker history migration", () => {
	it("is additive and creates lineage tables in the empty-database baseline", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('CREATE TABLE "hr_person_identity_version"');
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_worker_classification_version"',
		);
		expect(migrationSql).toContain('"supersedes_identity_version_id" uuid');
		expect(migrationSql).toContain(
			'"supersedes_classification_version_id" uuid',
		);
		expect(migrationSql).toContain('"effective_from" date NOT NULL');
		expect(migrationSql).toContain('"effective_to" date');
	});

	it("constrains one open active segment per person and worker", () => {
		expect(migrationSql).toContain(
			"hr_person_identity_version_org_person_open_uidx",
		);
		expect(migrationSql).toContain(
			"hr_worker_classification_version_org_worker_open_uidx",
		);
	});
});
