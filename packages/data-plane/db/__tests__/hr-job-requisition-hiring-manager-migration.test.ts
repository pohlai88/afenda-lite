import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"hr_job_requisition",
	"hr_employee",
]);

describe("HR job requisition hiring manager migration", () => {
	it("is additive and adds nullable hiring_manager_employee_id FK", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('"hiring_manager_employee_id" uuid');
		expect(migrationSql).toContain(
			"hr_job_requisition_hiring_manager_employee_id_hr_employee_id_fk",
		);
		expect(migrationSql).toContain('"hr_employee"("id")');
	});
});
