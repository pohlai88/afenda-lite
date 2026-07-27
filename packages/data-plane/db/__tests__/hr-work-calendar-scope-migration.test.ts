import { describe, expect, it } from "vitest";

import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"hr_work_calendar_scope_assignment",
	"hr_work_calendar",
]);

describe("HR work calendar scope migration", () => {
	it("creates scoped assignment table with precedence scope types", () => {
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_work_calendar_scope_assignment"',
		);
		expect(migrationSql).toContain(
			"'employment', 'employee', 'location', 'department', 'legal_entity', 'organization'",
		);
	});

	it("indexes organization scope and effective-from uniqueness", () => {
		expect(migrationSql).toContain(
			'"hr_work_calendar_scope_assignment_org_scope_idx"',
		);
		expect(migrationSql).toContain(
			'"hr_work_calendar_scope_assignment_org_scope_from_uidx"',
		);
	});

	it("references hr_work_calendar without destructive backfill", () => {
		expect(migrationSql).toContain(
			'"hr_work_calendar_scope_assignment_calendar_id_hr_work_calendar_id_fk"',
		);
		expect(migrationSql).not.toMatch(
			/UPDATE "hr_work_calendar_scope_assignment"/,
		);
	});
});
