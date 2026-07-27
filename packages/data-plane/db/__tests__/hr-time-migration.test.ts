import { describe, expect, it } from "vitest";

import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"hr_timesheet",
	"hr_timesheet_approval_decision",
	"hr_attendance_adjustment",
]);

describe("HR Time policy migration", () => {
	it("requires governed approval steps for submitted timesheets", () => {
		expect(migrationSql).toContain(
			'CONSTRAINT "hr_timesheet_approval_progress_check"',
		);
		expect(migrationSql).toContain('"hr_timesheet"."status" <> \'submitted\'');
		expect(migrationSql).toContain(
			'jsonb_array_length("hr_timesheet"."required_approval_steps") >= 1',
		);
	});

	it("enforces approval vocabulary, uniqueness, and progress", () => {
		expect(migrationSql).toContain(
			'"required_approval_steps" <@ \'["line_manager", "department", "hr", "payroll"]\'::jsonb',
		);
		expect(migrationSql).toContain(
			'"hr_timesheet"."required_approval_steps"->>0 <> "hr_timesheet"."required_approval_steps"->>1',
		);
		expect(migrationSql).toContain(
			'"hr_timesheet"."completed_approval_steps" <= jsonb_array_length("hr_timesheet"."required_approval_steps")',
		);
	});

	it("preserves exact approval-authority provenance", () => {
		expect(migrationSql).toContain('"authority_assignment_id" uuid NOT NULL');
		expect(migrationSql).toContain(
			'CONSTRAINT "hr_timesheet_approval_decision_authority_assignment_id_hr_time_approval_authority_assignment_id_fk"',
		);
	});

	it("adds ordered attendance-correction provenance without fabricating legacy facts", () => {
		for (const column of [
			"sequence",
			"event_version_before",
			"event_version_after",
			"previous_notes",
			"new_notes",
			"evidence_reference",
			"correlation_id",
		]) {
			expect(migrationSql).toContain(`"${column}"`);
		}
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "hr_attendance_adjustment_org_event_sequence_uq"',
		);
		expect(migrationSql).toContain(
			'WHERE "hr_attendance_adjustment"."sequence" IS NOT NULL',
		);
		expect(migrationSql).not.toMatch(
			/UPDATE "hr_attendance_adjustment"[\s\S]*event_version_before/,
		);
	});
});
