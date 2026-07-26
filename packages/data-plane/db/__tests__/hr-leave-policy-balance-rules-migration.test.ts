import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0048_hr_leave_policy_balance_rules.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR leave policy balance rules migration", () => {
	it("is additive and adds balance-rule columns with checks", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('ADD COLUMN "accrual_basis" text');
		expect(migrationSql).toContain('ADD COLUMN "accrual_frequency" text');
		expect(migrationSql).toContain(
			'ADD COLUMN "accrual_quantity_per_period" text',
		);
		expect(migrationSql).toContain(
			'ADD COLUMN "carry_forward_enabled" boolean',
		);
		expect(migrationSql).toContain(
			'ADD COLUMN "carry_forward_max_quantity" text',
		);
		expect(migrationSql).toContain('ADD COLUMN "entitlement_expiry_rule" text');
		expect(migrationSql).toContain(
			'ADD COLUMN "entitlement_expiry_days" integer',
		);
		expect(migrationSql).toContain('"hr_leave_policy_accrual_basis_check"');
		expect(migrationSql).toContain('"hr_leave_policy_accrual_config_check"');
		expect(migrationSql).toContain('"hr_leave_policy_carry_forward_check"');
		expect(migrationSql).toContain(
			'"hr_leave_policy_entitlement_expiry_days_check"',
		);
	});
});
