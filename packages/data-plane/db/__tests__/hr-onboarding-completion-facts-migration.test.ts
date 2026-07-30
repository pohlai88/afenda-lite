import { describe, expect, it } from "vitest";

import { assertAdditiveMigrations } from "../scripts/lib/assert-additive-migration.mjs";
import {
	readCurrentMigrationSql,
	readCurrentMigrations,
} from "./helpers/current-migration-sql";

const migrationSql = readCurrentMigrationSql();

describe("HR onboarding completion facts migration", () => {
	it("is additive and creates orientation/equipment/access handoff tables", () => {
		const result = assertAdditiveMigrations(readCurrentMigrations());
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('CREATE TABLE "hr_onboarding_orientation"');
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_onboarding_equipment_handoff"',
		);
		expect(migrationSql).toContain(
			'CREATE TABLE "hr_onboarding_access_handoff"',
		);
		expect(migrationSql).toContain("hr_onboarding_orientation_org_case_uidx");
		expect(migrationSql).toContain("\"status\" IN ('pending', 'acknowledged')");
	});
});
