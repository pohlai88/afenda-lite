import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0027_hr_person_worker_history.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR person and worker history migration", () => {
	it("is additive and creates lineage tables with backfill", () => {
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
		expect(migrationSql).toContain('INSERT INTO "hr_person_identity_version"');
		expect(migrationSql).toContain(
			'INSERT INTO "hr_worker_classification_version"',
		);
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
