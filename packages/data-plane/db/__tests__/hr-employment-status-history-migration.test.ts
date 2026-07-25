import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0028_hr_employment_status_history.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR employment status history migration", () => {
	it("is additive and creates append-only status history with range check", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain(
			'CREATE TABLE IF NOT EXISTS "hr_employment_status_history"',
		);
		expect(migrationSql).toContain(
			"hr_employment_status_history_org_employment_effective_idx",
		);
		expect(migrationSql).toContain(
			"hr_employment_status_history_org_employee_effective_idx",
		);
		expect(migrationSql).toContain(
			'hr_employment_status_history_change_kind_check',
		);
		expect(migrationSql).toContain('"change_kind" IN (\'create\', \'lifecycle\', \'correction\')');
		expect(migrationSql).toContain("hr_employment_effective_range_ck");
		expect(migrationSql).toContain(
			'"ends_on" IS NULL OR "starts_on" <= "ends_on"',
		);
	});
});
