import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables(["hr_candidate"]);

describe("HR candidate consent migration", () => {
	it("is additive and adds nullable consent columns", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('"consent_policy_version" text');
		expect(migrationSql).toContain(
			'"consent_captured_at" timestamp with time zone',
		);
		expect(migrationSql).toContain('"consent_source" text');
		expect(migrationSql).toContain('"retention_until" date');
		expect(migrationSql).toContain(
			'"consent_withdrawn_at" timestamp with time zone',
		);
	});

	it("constrains consent source values when present", () => {
		expect(migrationSql).toContain('"hr_candidate_consent_source_check"');
		expect(migrationSql).toContain("'self_service'");
		expect(migrationSql).toContain("'recruiter_recorded'");
		expect(migrationSql).toContain("'import'");
	});
});
