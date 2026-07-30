import { describe, expect, it } from "vitest";

import { assertAdditiveMigrations } from "../scripts/lib/assert-additive-migration.mjs";
import {
	readCurrentMigrationSql,
	readCurrentMigrations,
} from "./helpers/current-migration-sql";

const migrationSql = readCurrentMigrationSql();

describe("HR person management completion migration", () => {
	it("is additive and extends person with contacts and identifiers", () => {
		const result = assertAdditiveMigrations(readCurrentMigrations());
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('"preferred_name"');
		expect(migrationSql).toContain('"privacy_classification"');
		expect(migrationSql).toContain('CREATE TABLE "hr_person_contact"');
		expect(migrationSql).toContain('CREATE TABLE "hr_person_identifier"');
		expect(migrationSql).toContain(
			"hr_person_contact_org_person_type_primary_uidx",
		);
		expect(migrationSql).toContain(
			"hr_person_identifier_org_type_fingerprint_open_uidx",
		);
		expect(migrationSql).toContain("hr_person_privacy_classification_check");
	});
});
