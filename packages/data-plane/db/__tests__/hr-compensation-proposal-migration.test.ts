import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"hr_compensation_proposal",
	"hr_employment_offer",
]);

describe("HR compensation proposal migration", () => {
	it("is additive and creates hr_compensation_proposal with offer FK", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('CREATE TABLE "hr_compensation_proposal"');
		expect(migrationSql).toContain('"compensation_proposal_id" uuid');
		expect(migrationSql).toContain(
			"hr_employment_offer_org_application_active_uidx",
		);
		expect(migrationSql).toContain(
			"\"hr_employment_offer\".\"status\" IN ('draft', 'approved', 'issued')",
		);
	});
});
