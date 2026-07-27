import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"hr_department_structure_version",
	"hr_job_definition_version",
	"hr_position_definition_version",
	"hr_reporting_line",
]);

describe("HR organization structure lineage migration", () => {
	it("is additive and creates lineage tables in the empty-database baseline", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_department_structure_version"',
		);
		expect(migrationSql).toContain('CREATE TABLE "hr_job_definition_version"');
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_position_definition_version"',
		);
		expect(migrationSql).toContain('"supersedes_structure_version_id" uuid');
		expect(migrationSql).toContain('"supersedes_definition_version_id" uuid');
	});

	it("adds reporting-line supersession links and constrains one open segment", () => {
		expect(migrationSql).toContain('"supersedes_reporting_line_id" uuid');
		expect(migrationSql).toContain('"superseded_by_reporting_line_id" uuid');
		expect(migrationSql).toContain(
			"hr_department_structure_version_org_department_open_uidx",
		);
		expect(migrationSql).toContain(
			"hr_job_definition_version_org_job_open_uidx",
		);
		expect(migrationSql).toContain(
			"hr_position_definition_version_org_position_open_uidx",
		);
	});
});
