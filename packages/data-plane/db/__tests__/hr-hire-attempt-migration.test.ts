import { describe, expect, it } from "vitest";

import { assertAdditiveMigrations } from "../scripts/lib/assert-additive-migration.mjs";
import {
	readCurrentMigrationSql,
	readCurrentMigrations,
} from "./helpers/current-migration-sql";

const migrationSql = readCurrentMigrationSql();

describe("HR hire attempt migration", () => {
	it("is additive and creates hr_hire_attempt with saga indexes", () => {
		const result = assertAdditiveMigrations(readCurrentMigrations());
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('CREATE TABLE "hr_hire_attempt"');
		expect(migrationSql).toContain("hr_hire_attempt_org_idempotency_uidx");
		expect(migrationSql).toContain("hr_hire_attempt_org_offer_open_uidx");
		expect(migrationSql).toContain(
			"\"status\" IN ('in_progress', 'completed')",
		);
	});
});
