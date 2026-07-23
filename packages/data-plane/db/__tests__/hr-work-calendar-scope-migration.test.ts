import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0007_hr_work_calendar_scope.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR work calendar scope migration", () => {
	it("creates scoped assignment table with precedence scope types", () => {
		expect(migrationSql).toContain(
			'CREATE TABLE IF NOT EXISTS "hr_work_calendar_scope_assignment"',
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
		expect(migrationSql).not.toMatch(/UPDATE "hr_work_calendar_scope_assignment"/);
	});
});
