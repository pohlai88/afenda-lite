import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"hr_candidate_application_status_history",
]);

describe("HR candidate application status history migration", () => {
	it("is additive and creates append-only application status history", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_candidate_application_status_history"',
		);
		expect(migrationSql).toContain(
			"hr_candidate_application_status_history_org_application_created_idx",
		);
		expect(migrationSql).toContain(
			"hr_candidate_application_status_history_org_candidate_idx",
		);
		expect(migrationSql).toContain(
			"hr_candidate_application_status_history_change_kind_check",
		);
		expect(migrationSql).toContain(
			"\"change_kind\" IN ('create', 'lifecycle')",
		);
		expect(migrationSql).toContain(
			"hr_candidate_application_status_history_to_status_check",
		);
	});
});
