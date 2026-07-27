import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"hr_employment_status_history",
	"hr_employment",
]);

describe("HR employment status history migration", () => {
	it("is additive and creates append-only status history with range check", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_employment_status_history"',
		);
		expect(migrationSql).toContain(
			"hr_employment_status_history_org_employment_effective_idx",
		);
		expect(migrationSql).toContain(
			"hr_employment_status_history_org_employee_effective_idx",
		);
		expect(migrationSql).toContain(
			"hr_employment_status_history_change_kind_check",
		);
		expect(migrationSql).toContain(
			"\"change_kind\" IN ('create', 'lifecycle', 'correction')",
		);
		expect(migrationSql).toContain("hr_employment_effective_range_ck");
		expect(migrationSql).toContain(
			'"hr_employment"."ends_on" IS NULL OR "hr_employment"."starts_on" <= "hr_employment"."ends_on"',
		);
	});
});
