import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
	db,
	payrollCalendar,
	payrollException,
	payrollPayGroup,
	payrollPeriod,
	payrollRun,
} from "@afenda/db";
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
	deletePayrollConstraintOrg,
	isPayrollFoundationMigrationApplied,
	type PayrollConstraintSeed,
	postgresSqlState,
	seedPayrollConstraintChain,
} from "./helpers/payroll-constraint-live";

const migrationPath = fileURLToPath(
	new URL(
		"../../../data-plane/db/drizzle/0011_payroll_foundation.sql",
		import.meta.url,
	),
);
const migrationSql = readFileSync(migrationPath, "utf8");
const assignmentInputsMigrationPath = fileURLToPath(
	new URL(
		"../../../data-plane/db/drizzle/0014_payroll_assignment_inputs.sql",
		import.meta.url,
	),
);
const assignmentInputsMigrationSql = readFileSync(
	assignmentInputsMigrationPath,
	"utf8",
);
const calculationOutputsMigrationPath = fileURLToPath(
	new URL(
		"../../../data-plane/db/drizzle/0016_payroll_calculation_outputs.sql",
		import.meta.url,
	),
);
const calculationOutputsMigrationSql = readFileSync(
	calculationOutputsMigrationPath,
	"utf8",
);

const { hasDatabase } = resolveDatabaseUrlForTests();
const payrollFoundationReady =
	hasDatabase && (await isPayrollFoundationMigrationApplied());

describe("Payroll foundation migration SQL", () => {
	it("expands setup and run tables additively", () => {
		for (const table of [
			"payroll_calendar",
			"payroll_pay_group",
			"payroll_period",
			"payroll_earning_rule",
			"payroll_deduction_rule",
			"payroll_statutory_rule",
			"payroll_run",
			"payroll_exception",
		]) {
			expect(migrationSql).toContain(`ALTER TABLE "${table}" ADD COLUMN`);
		}
		expect(migrationSql).not.toMatch(/DROP TABLE "payroll_/);
		expect(migrationSql).not.toMatch(/DROP COLUMN/);
	});

	it("declares org-scoped composite foreign keys within payroll_*", () => {
		expect(migrationSql).toContain(
			'"payroll_pay_group" ADD CONSTRAINT "payroll_pay_group_org_calendar_fk"',
		);
		expect(migrationSql).toContain(
			'"payroll_period" ADD CONSTRAINT "payroll_period_org_pay_group_fk"',
		);
		expect(migrationSql).toContain(
			'"payroll_run" ADD CONSTRAINT "payroll_run_org_pay_group_fk"',
		);
		expect(migrationSql).toContain(
			'"payroll_exception" ADD CONSTRAINT "payroll_exception_org_run_fk"',
		);
		expect(migrationSql).not.toMatch(/REFERENCES "public"\."hr_/);
	});

	it("enforces run identity and status vocabulary", () => {
		expect(migrationSql).toContain('"payroll_run_org_identity_uidx"');
		expect(migrationSql).toContain(
			"\"payroll_run_status_check\" CHECK (\"status\" IN ('draft', 'calculating', 'calculated', 'failed', 'finalized', 'reversed'))",
		);
		expect(migrationSql).toContain(
			"\"payroll_exception_severity_check\" CHECK (\"severity\" IN ('blocking', 'warning'))",
		);
	});

	it("requires idempotency columns on mutable creates", () => {
		for (const table of [
			"payroll_calendar",
			"payroll_pay_group",
			"payroll_period",
			"payroll_earning_rule",
			"payroll_run",
		]) {
			expect(migrationSql).toMatch(
				new RegExp(
					`"${table}" ADD COLUMN IF NOT EXISTS "create_idempotency_key"`,
				),
			);
		}
	});
});

describe("Payroll assignment/input migration SQL", () => {
	it("expands assignment and input tables additively", () => {
		for (const table of [
			"payroll_employee_assignment",
			"payroll_recurring_earning",
			"payroll_recurring_deduction",
			"payroll_variable_input",
		]) {
			expect(assignmentInputsMigrationSql).toContain(
				`ALTER TABLE "${table}" ADD COLUMN`,
			);
		}
		expect(assignmentInputsMigrationSql).not.toMatch(/DROP TABLE "payroll_/);
	});

	it("declares external source idempotency for variable inputs", () => {
		expect(assignmentInputsMigrationSql).toContain(
			'"payroll_variable_input_org_source_uidx"',
		);
	});

	it("declares org-scoped composite foreign keys within payroll_*", () => {
		expect(assignmentInputsMigrationSql).toContain(
			'"payroll_employee_assignment" ADD CONSTRAINT "payroll_employee_assignment_org_pay_group_fk"',
		);
		expect(assignmentInputsMigrationSql).toContain(
			'"payroll_recurring_earning" ADD CONSTRAINT "payroll_recurring_earning_org_assignment_fk"',
		);
		expect(assignmentInputsMigrationSql).toContain(
			'"payroll_recurring_earning" ADD CONSTRAINT "payroll_recurring_earning_org_earning_rule_fk"',
		);
		expect(assignmentInputsMigrationSql).toContain(
			'"payroll_recurring_deduction" ADD CONSTRAINT "payroll_recurring_deduction_org_assignment_fk"',
		);
		expect(assignmentInputsMigrationSql).toContain(
			'"payroll_recurring_deduction" ADD CONSTRAINT "payroll_recurring_deduction_org_deduction_rule_fk"',
		);
		expect(assignmentInputsMigrationSql).toContain(
			'"payroll_variable_input" ADD CONSTRAINT "payroll_variable_input_org_pay_group_fk"',
		);
	});

	it("does not reference hr_* tables", () => {
		expect(assignmentInputsMigrationSql).not.toMatch(
			/REFERENCES "public"\."hr_/,
		);
	});
});

describe("Payroll calculation outputs migration SQL", () => {
	it("promotes output scaffolds and run metadata additively", () => {
		for (const table of [
			"payroll_run_employee",
			"payroll_result_line",
			"payroll_statutory_result",
		]) {
			expect(calculationOutputsMigrationSql).toContain(
				`ALTER TABLE "${table}" ADD COLUMN`,
			);
		}
		expect(calculationOutputsMigrationSql).toContain(
			'"payroll_run" ADD COLUMN IF NOT EXISTS "calculation_version"',
		);
		expect(calculationOutputsMigrationSql).toContain(
			'"payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "tax_timing"',
		);
		expect(calculationOutputsMigrationSql).not.toMatch(/DROP TABLE "payroll_/);
		expect(calculationOutputsMigrationSql).not.toMatch(/DROP COLUMN/);
	});

	it("declares calculation output constraints and org-scoped keys", () => {
		expect(calculationOutputsMigrationSql).toContain(
			"\"payroll_run_employee_status_check\" CHECK (\"status\" IN ('calculated', 'failed'))",
		);
		expect(calculationOutputsMigrationSql).toContain(
			"\"payroll_result_line_kind_check\" CHECK (\"line_kind\" IN ('earning', 'pre_tax_deduction', 'employee_statutory', 'post_tax_deduction', 'employer_contribution'))",
		);
		expect(calculationOutputsMigrationSql).toContain(
			"\"payroll_deduction_rule_tax_timing_check\" CHECK (\"tax_timing\" IN ('pre_tax', 'post_tax'))",
		);
		expect(calculationOutputsMigrationSql).toContain(
			'"payroll_run_employee_org_run_employee_uidx"',
		);
		expect(calculationOutputsMigrationSql).toContain(
			'"payroll_run_employee_org_id_uidx"',
		);
		expect(calculationOutputsMigrationSql).toContain(
			'"payroll_result_line_org_run_employee_sequence_uidx"',
		);
	});
});

describe.skipIf(!payrollFoundationReady)(
	"Payroll foundation DB constraints (live inserts)",
	() => {
		const runId = `${Date.now()}`;
		const organizationId = `org-payroll-constraint-${runId}`;
		const actorUserId = `user-payroll-constraint-${runId}`;
		let seed: PayrollConstraintSeed;

		beforeAll(async () => {
			seed = await seedPayrollConstraintChain({
				organizationId,
				actorUserId,
				suffix: runId,
			});
		});

		afterAll(async () => {
			await deletePayrollConstraintOrg(organizationId);
		});

		it("rejects invalid run status via payroll_run_status_check", async () => {
			await expect(
				db.insert(payrollRun).values({
					id: crypto.randomUUID(),
					organizationId,
					payGroupId: seed.payGroupId,
					periodId: seed.periodId,
					runType: "regular",
					sequence: 2,
					status: "not-a-status",
					finalizedAt: null,
					finalizedBy: null,
					calculationSnapshotHash: null,
					createIdempotencyKey: `idem-run-bad-status-${runId}`,
					createRequestFingerprint: `fp-run-bad-status-${runId}`,
					version: 1,
					createdBy: actorUserId,
					updatedBy: actorUserId,
				}),
			).rejects.toSatisfy((error: unknown) => {
				return postgresSqlState(error) === "23514";
			});
		});

		it("rejects inverted period ranges via payroll_period_range_check", async () => {
			await expect(
				db.insert(payrollPeriod).values({
					id: crypto.randomUUID(),
					organizationId,
					payGroupId: seed.payGroupId,
					periodStart: "2025-02-28",
					periodEnd: "2025-02-01",
					cutoffDate: "2025-02-25",
					status: "open",
					createIdempotencyKey: `idem-period-bad-range-${runId}`,
					createRequestFingerprint: `fp-period-bad-range-${runId}`,
					version: 1,
					createdBy: actorUserId,
					updatedBy: actorUserId,
				}),
			).rejects.toSatisfy((error: unknown) => {
				return postgresSqlState(error) === "23514";
			});
		});

		it("rejects invalid exception severity via payroll_exception_severity_check", async () => {
			await expect(
				db.insert(payrollException).values({
					id: crypto.randomUUID(),
					organizationId,
					runId: seed.runId,
					severity: "critical",
					exceptionCode: "BAD_SEVERITY",
					message: "Synthetic invalid severity",
					employeeRef: null,
					createdBy: actorUserId,
				}),
			).rejects.toSatisfy((error: unknown) => {
				return postgresSqlState(error) === "23514";
			});
		});

		it("rejects duplicate run identity via payroll_run_org_identity_uidx", async () => {
			await expect(
				db.insert(payrollRun).values({
					id: crypto.randomUUID(),
					organizationId,
					payGroupId: seed.payGroupId,
					periodId: seed.periodId,
					runType: "regular",
					sequence: 1,
					status: "draft",
					finalizedAt: null,
					finalizedBy: null,
					calculationSnapshotHash: null,
					createIdempotencyKey: `idem-run-dup-identity-${runId}`,
					createRequestFingerprint: `fp-run-dup-identity-${runId}`,
					version: 1,
					createdBy: actorUserId,
					updatedBy: actorUserId,
				}),
			).rejects.toSatisfy((error: unknown) => {
				return postgresSqlState(error) === "23505";
			});
		});

		it("rejects duplicate pay group code via payroll_pay_group_org_code_uidx", async () => {
			await expect(
				db.insert(payrollPayGroup).values({
					id: crypto.randomUUID(),
					organizationId,
					calendarId: seed.calendarId,
					code: `PG-${runId}`,
					name: "Duplicate pay group code",
					currencyCode: "USD",
					status: "active",
					createIdempotencyKey: `idem-pg-dup-code-${runId}`,
					createRequestFingerprint: `fp-pg-dup-code-${runId}`,
					version: 1,
					createdBy: actorUserId,
					updatedBy: actorUserId,
				}),
			).rejects.toSatisfy((error: unknown) => {
				return postgresSqlState(error) === "23505";
			});
		});

		it("rejects missing run FK via payroll_exception_org_run_fk", async () => {
			await expect(
				db.insert(payrollException).values({
					id: crypto.randomUUID(),
					organizationId,
					runId: crypto.randomUUID(),
					severity: "blocking",
					exceptionCode: "MISSING_RUN",
					message: "Synthetic missing run FK",
					employeeRef: null,
					createdBy: actorUserId,
				}),
			).rejects.toSatisfy((error: unknown) => {
				return postgresSqlState(error) === "23503";
			});
		});

		it("rejects missing calendar FK via payroll_pay_group_org_calendar_fk", async () => {
			await expect(
				db.insert(payrollPayGroup).values({
					id: crypto.randomUUID(),
					organizationId,
					calendarId: crypto.randomUUID(),
					code: `PG-ORPHAN-${runId}`,
					name: "Orphan pay group",
					currencyCode: "USD",
					status: "active",
					createIdempotencyKey: `idem-pg-orphan-${runId}`,
					createRequestFingerprint: `fp-pg-orphan-${runId}`,
					version: 1,
					createdBy: actorUserId,
					updatedBy: actorUserId,
				}),
			).rejects.toSatisfy((error: unknown) => {
				return postgresSqlState(error) === "23503";
			});
		});
	},
);

describe("@afenda/payroll schema constraints (live gate)", () => {
	it("documents live insert gate when DATABASE_URL or migration 0011 is absent", () => {
		const requireDatabase =
			process.env.REQUIRE_DATABASE_TESTS === "1" ||
			process.env.REQUIRE_DATABASE_TESTS === "true" ||
			process.env.CI === "true" ||
			process.env.CI === "1";

		if (requireDatabase && hasDatabase && !payrollFoundationReady) {
			throw new Error(
				"Payroll foundation migration 0011 is not applied — live constraint proofs cannot skip under REQUIRE_DATABASE_TESTS=1. Apply pending migrations with AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate.",
			);
		}

		if (payrollFoundationReady) {
			expect(hasDatabase).toBe(true);
			return;
		}
		if (!hasDatabase) {
			expect(hasDatabase).toBe(false);
			return;
		}
		expect(payrollFoundationReady).toBe(false);
	});
});
