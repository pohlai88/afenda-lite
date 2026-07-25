import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0031_hr_work_assignment_truth.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR work assignment truth migration", () => {
	it("is additive and adds lineage, snapshots, and employment starts index", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('"predecessor_assignment_id"');
		expect(migrationSql).toContain('"successor_assignment_id"');
		expect(migrationSql).toContain('"transfer_movement_id"');
		expect(migrationSql).toContain('"manager_employee_id_snapshot"');
		expect(migrationSql).toContain('"work_calendar_id_snapshot"');
		expect(migrationSql).toContain(
			"hr_work_assignment_predecessor_assignment_fk",
		);
		expect(migrationSql).toContain("hr_work_assignment_successor_assignment_fk");
		expect(migrationSql).toContain("hr_work_assignment_transfer_movement_fk");
		expect(migrationSql).toContain(
			"hr_work_assignment_org_employment_starts_idx",
		);
	});
});
