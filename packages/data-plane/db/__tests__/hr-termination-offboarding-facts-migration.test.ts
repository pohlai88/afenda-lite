import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"hr_termination",
	"hr_offboarding_access_revocation",
	"hr_offboarding_payroll_handoff",
]);

describe("HR termination offboarding facts migration", () => {
	it("is additive and extends termination plus offboarding fact tables", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('"approved_at" timestamp with time zone');
		expect(migrationSql).toContain(
			'"rehire_eligible" boolean DEFAULT true NOT NULL',
		);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_offboarding_access_revocation"',
		);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_offboarding_payroll_handoff"',
		);
		expect(migrationSql).toContain("hr_termination_org_employment_draft_uidx");
		expect(migrationSql).toContain("\"status\" IN ('pending', 'revoked')");
		expect(migrationSql).toContain("\"status\" IN ('pending', 'ready')");
	});
});
