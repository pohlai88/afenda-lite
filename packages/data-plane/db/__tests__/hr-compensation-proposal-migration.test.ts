import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0043_hr_compensation_proposal.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR compensation proposal migration", () => {
	it("is additive and creates hr_compensation_proposal with offer FK", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('CREATE TABLE "hr_compensation_proposal"');
		expect(migrationSql).toContain(
			'ADD COLUMN "compensation_proposal_id" uuid',
		);
		expect(migrationSql).toContain(
			"hr_employment_offer_org_application_active_uidx",
		);
		expect(migrationSql).toContain(
			"status IN ('draft', 'approved', 'issued')",
		);
	});
});
