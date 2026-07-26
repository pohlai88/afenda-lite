import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0055_hr_performance_cycle_slice_92.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR performance cycle slice 9.2 migration", () => {
	it("is additive and extends cycle lifecycle with review periods and eligibility", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain(
			`"hr_performance_cycle"."status" IN ('draft', 'published', 'open', 'closed', 'cancelled')`,
		);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_performance_cycle_review_period"',
		);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_performance_cycle_eligibility"',
		);
		expect(migrationSql).toContain(
			'"hr_performance_cycle_review_period_org_cycle_kind_uidx"',
		);
		expect(migrationSql).toContain(
			'"hr_performance_cycle_eligibility_org_cycle_uidx"',
		);
	});
});
