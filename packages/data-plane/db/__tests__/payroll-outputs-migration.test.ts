import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
	fileURLToPath(
		new URL(
			"../drizzle/0046_payroll_outputs_reconciliation_adjustments.sql",
			import.meta.url,
		),
	),
	"utf8",
);

describe("payroll output semantic cutover migration", () => {
	it("fails closed when retired scaffold tables contain data", () => {
		expect(migrationSql).toContain(
			"Payroll semantic cutover requires empty scaffold tables and no legacy reversed runs",
		);
		expect(migrationSql).toContain("IF EXISTS (SELECT 1 FROM payroll_payslip)");
	});

	it("enforces tenant-scoped lineage, idempotency, and reconciliation invariants", () => {
		expect(migrationSql).toContain(
			"payroll_payslip_org_run_employee_lineage_fk",
		);
		expect(migrationSql).toContain(
			"payroll_run_employee_org_id_run_employee_uidx",
		);
		expect(migrationSql).toContain("payroll_adjustment_org_original_run_fk");
		expect(migrationSql).toContain("payroll_reconciliation_org_run_fk");
		expect(migrationSql).toContain("payroll_adjustment_org_idempotency_uidx");
		expect(migrationSql).toContain(
			"payroll_reconciliation_org_idempotency_uidx",
		);
		expect(migrationSql).toContain(
			"payroll_reconciliation_nonnegative_amounts_check",
		);
		expect(migrationSql).toContain(
			"payroll_reconciliation_resolution_evidence_check",
		);
		expect(migrationSql).toContain("payroll_run_reversal_evidence_check");
		expect(migrationSql).toContain("payroll_run_org_reversal_idempotency_uidx");
	});
});
