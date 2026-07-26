import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL(
		"../drizzle/0036_hr_person_management_completion.sql",
		import.meta.url,
	),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR person management completion migration", () => {
	it("is additive and extends person with contacts and identifiers", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
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
