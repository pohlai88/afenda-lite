import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL(
		"../drizzle/0047_hr_termination_offboarding_facts.sql",
		import.meta.url,
	),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR termination offboarding facts migration", () => {
	it("is additive and extends termination plus offboarding fact tables", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain(
			'ALTER TABLE "hr_termination" ADD COLUMN "approved_at"',
		);
		expect(migrationSql).toContain(
			'ALTER TABLE "hr_termination" ADD COLUMN "rehire_eligible"',
		);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_offboarding_access_revocation"',
		);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_offboarding_payroll_handoff"',
		);
		expect(migrationSql).toContain("hr_termination_org_employment_draft_uidx");
		expect(migrationSql).toContain('"status" IN (\'pending\', \'revoked\')');
		expect(migrationSql).toContain('"status" IN (\'pending\', \'ready\')');
	});
});
