import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"hr_work_assignment",
	"hr_employment_movement",
]);

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
			"hr_work_assignment_predecessor_assignment_id_hr_work_assignment_id_fk",
		);
		expect(migrationSql).toContain(
			"hr_work_assignment_successor_assignment_id_hr_work_assignment_id_fk",
		);
		expect(migrationSql).toContain(
			"hr_work_assignment_transfer_movement_id_hr_employment_movement_id_fk",
		);
		expect(migrationSql).toContain(
			"hr_work_assignment_org_employment_starts_idx",
		);
	});
});
