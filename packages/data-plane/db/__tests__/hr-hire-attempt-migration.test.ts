import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0044_hr_hire_attempt.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR hire attempt migration", () => {
	it("is additive and creates hr_hire_attempt with saga indexes", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('CREATE TABLE "hr_hire_attempt"');
		expect(migrationSql).toContain("hr_hire_attempt_org_idempotency_uidx");
		expect(migrationSql).toContain("hr_hire_attempt_org_offer_open_uidx");
		expect(migrationSql).toContain(
			"\"status\" IN ('in_progress', 'completed')",
		);
	});
});
