import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0029_hr_employment_contract_lineage.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR employment contract lineage migration", () => {
	it("is additive and adds lineage, reason, and partial reference uniqueness", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('"lineage_status"');
		expect(migrationSql).toContain('"supersedes_contract_id"');
		expect(migrationSql).toContain('"superseded_by_contract_id"');
		expect(migrationSql).toContain('"reason_code"');
		expect(migrationSql).toContain('"source_reference"');
		expect(migrationSql).toContain(
			"hr_employment_contract_lineage_status_check",
		);
		expect(migrationSql).toContain(
			"hr_employment_contract_org_employment_ref_active_uidx",
		);
		expect(migrationSql).toContain(
			"hr_employment_contract_org_employment_starts_idx",
		);
		expect(migrationSql).toContain('"lineage_status" = \'active\'');
	});
});
