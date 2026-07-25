import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL(
		"../drizzle/0042_hr_interview_evaluation_scorecard.sql",
		import.meta.url,
	),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR interview evaluation scorecard migration", () => {
	it("is additive and adds structured scorecard_json to evaluations", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('"scorecard_json"');
		expect(migrationSql).toContain(
			"hr_interview_evaluation_scorecard_json_check",
		);
		expect(migrationSql).toContain("jsonb_array_length");
	});
});
