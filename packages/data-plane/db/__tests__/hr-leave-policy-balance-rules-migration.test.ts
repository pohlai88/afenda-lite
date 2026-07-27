import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables(["hr_leave_policy"]);

describe("HR leave policy balance rules migration", () => {
	it("is additive and adds balance-rule columns with checks", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain(
			"\"accrual_basis\" text DEFAULT 'none' NOT NULL",
		);
		expect(migrationSql).toContain('"accrual_frequency" text');
		expect(migrationSql).toContain('"accrual_quantity_per_period" text');
		expect(migrationSql).toContain(
			'"carry_forward_enabled" boolean DEFAULT false NOT NULL',
		);
		expect(migrationSql).toContain('"carry_forward_max_quantity" text');
		expect(migrationSql).toContain(
			"\"entitlement_expiry_rule\" text DEFAULT 'none' NOT NULL",
		);
		expect(migrationSql).toContain('"entitlement_expiry_days" integer');
		expect(migrationSql).toContain('"hr_leave_policy_accrual_basis_check"');
		expect(migrationSql).toContain('"hr_leave_policy_accrual_config_check"');
		expect(migrationSql).toContain('"hr_leave_policy_carry_forward_check"');
		expect(migrationSql).toContain(
			'"hr_leave_policy_entitlement_expiry_days_check"',
		);
	});
});
