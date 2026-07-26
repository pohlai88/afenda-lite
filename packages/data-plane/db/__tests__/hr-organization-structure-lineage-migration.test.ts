import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL(
		"../drizzle/0032_hr_organization_structure_lineage.sql",
		import.meta.url,
	),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR organization structure lineage migration", () => {
	it("is additive and creates lineage tables with backfill", () => {
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
		expect(migrationSql).toContain(
			'INSERT INTO "hr_department_structure_version"',
		);
		expect(migrationSql).toContain('INSERT INTO "hr_job_definition_version"');
		expect(migrationSql).toContain(
			'INSERT INTO "hr_position_definition_version"',
		);
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
