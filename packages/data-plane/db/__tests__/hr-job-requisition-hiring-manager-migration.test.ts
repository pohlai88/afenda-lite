import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL(
		"../drizzle/0038_hr_job_requisition_hiring_manager.sql",
		import.meta.url,
	),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR job requisition hiring manager migration", () => {
	it("is additive and adds nullable hiring_manager_employee_id FK", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain(
			'ADD COLUMN "hiring_manager_employee_id" uuid',
		);
		expect(migrationSql).toContain(
			"hr_job_requisition_hiring_manager_employee_id_hr_employee_id_fk",
		);
		expect(migrationSql).toContain('"hr_employee"("id")');
	});
});
