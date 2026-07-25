import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0046_hr_onboarding_completion_facts.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR onboarding completion facts migration", () => {
	it("is additive and creates orientation/equipment/access handoff tables", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('CREATE TABLE "hr_onboarding_orientation"');
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_onboarding_equipment_handoff"',
		);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_onboarding_access_handoff"',
		);
		expect(migrationSql).toContain("hr_onboarding_orientation_org_case_uidx");
		expect(migrationSql).toContain(
			'"status" IN (\'pending\', \'acknowledged\')',
		);
	});
});
