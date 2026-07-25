import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL(
		"../drizzle/0034_hr_attendance_event_source_sequence.sql",
		import.meta.url,
	),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR attendance event source sequence migration", () => {
	it("is additive and backfills source_sequence per work day", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "source_sequence" integer');
		expect(migrationSql).toContain("ROW_NUMBER() OVER");
		expect(migrationSql).toContain(
			'PARTITION BY "organization_id", "employee_id", "local_work_date"',
		);
		expect(migrationSql).toContain(
			'ORDER BY "occurred_at", "id"',
		);
		expect(migrationSql).toContain(
			'ALTER COLUMN "source_sequence" SET NOT NULL',
		);
	});
});
