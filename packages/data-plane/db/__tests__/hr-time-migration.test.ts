import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0006_hr_time_policy.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR Time policy migration", () => {
	it("returns legacy submitted timesheets for a governed resubmission", () => {
		const backfillPosition = migrationSql.indexOf('UPDATE "hr_timesheet"\nSET');
		const constraintPosition = migrationSql.indexOf(
			'ADD CONSTRAINT "hr_timesheet_approval_progress_check"',
		);

		expect(backfillPosition).toBeGreaterThan(-1);
		expect(constraintPosition).toBeGreaterThan(backfillPosition);
		expect(migrationSql).toContain("\"status\" = 'returned'");
		expect(migrationSql).toContain(
			'"submission_reference" IS NULL\n\t\tOR jsonb_array_length("required_approval_steps") = 0',
		);
		expect(migrationSql).toContain(
			"Approval policy snapshot required after Time approval migration.",
		);
	});

	it("enforces approval vocabulary, uniqueness, and progress", () => {
		expect(migrationSql).toContain(
			'"required_approval_steps" <@ \'["line_manager", "department", "hr", "payroll"]\'::jsonb',
		);
		expect(migrationSql).toContain(
			'"required_approval_steps"->>0 <> "required_approval_steps"->>1',
		);
		expect(migrationSql).toContain(
			'"completed_approval_steps" <= jsonb_array_length("required_approval_steps")',
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
			expect(migrationSql).toContain(`ADD COLUMN IF NOT EXISTS "${column}"`);
		}
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX IF NOT EXISTS "hr_attendance_adjustment_org_event_sequence_uq"',
		);
		expect(migrationSql).toContain('WHERE "sequence" IS NOT NULL');
		expect(migrationSql).not.toMatch(
			/UPDATE "hr_attendance_adjustment"[\s\S]*event_version_before/,
		);
	});
});
