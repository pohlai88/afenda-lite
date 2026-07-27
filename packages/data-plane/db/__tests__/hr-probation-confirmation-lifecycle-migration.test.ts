import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readCurrentMigrationSql } from "./helpers/current-migration-sql";

const migrationSql = readCurrentMigrationSql();

describe("HR probation confirmation lifecycle migration", () => {
	it("is additive and extends probation review plus assessment table", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('"last_extension_reason"');
		expect(migrationSql).toContain('"outcome_reason"');
		expect(migrationSql).toContain('CREATE TABLE "hr_probation_assessment"');
		expect(migrationSql).toContain(
			"hr_probation_review_outcome_recorded_on_range_ck",
		);
		expect(migrationSql).toContain(
			"hr_probation_assessment_org_probation_review_idx",
		);
	});
});
