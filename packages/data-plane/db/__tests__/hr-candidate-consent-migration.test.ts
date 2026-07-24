import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0017_hr_candidate_consent.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR candidate consent migration", () => {
	it("is additive and adds nullable consent columns", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain(
			'ADD COLUMN "consent_policy_version" text',
		);
		expect(migrationSql).toContain(
			'ADD COLUMN "consent_captured_at" timestamp with time zone',
		);
		expect(migrationSql).toContain('ADD COLUMN "consent_source" text');
		expect(migrationSql).toContain('ADD COLUMN "retention_until" date');
		expect(migrationSql).toContain(
			'ADD COLUMN "consent_withdrawn_at" timestamp with time zone',
		);
	});

	it("constrains consent source values when present", () => {
		expect(migrationSql).toContain('"hr_candidate_consent_source_check"');
		expect(migrationSql).toContain("'self_service'");
		expect(migrationSql).toContain("'recruiter_recorded'");
		expect(migrationSql).toContain("'import'");
	});
});
