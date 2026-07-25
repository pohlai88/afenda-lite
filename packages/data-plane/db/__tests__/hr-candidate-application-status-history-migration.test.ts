import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL(
		"../drizzle/0039_hr_candidate_application_status_history.sql",
		import.meta.url,
	),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR candidate application status history migration", () => {
	it("is additive and creates append-only application status history", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain(
			'CREATE TABLE IF NOT EXISTS "hr_candidate_application_status_history"',
		);
		expect(migrationSql).toContain(
			"hr_candidate_application_status_history_org_application_created_idx",
		);
		expect(migrationSql).toContain(
			"hr_candidate_application_status_history_org_candidate_idx",
		);
		expect(migrationSql).toContain(
			"hr_candidate_application_status_history_change_kind_check",
		);
		expect(migrationSql).toContain(
			'"change_kind" IN (\'create\', \'lifecycle\')',
		);
		expect(migrationSql).toContain(
			"hr_candidate_application_status_history_to_status_check",
		);
	});
});
