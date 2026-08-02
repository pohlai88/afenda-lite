import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashSnapshot } from "../src/features/calculation/calculation-snapshot";
import { finalizePayrollRun } from "../src/features/payroll-runs/finalization";
import {
	closePayrollPeriod,
	createPayrollPeriod,
	getPayrollPeriod,
	listPayrollPeriods,
	updatePayrollPeriod,
} from "../src/features/payroll-runs/payroll-period";
import { createPayrollRun } from "../src/features/payroll-runs/payroll-run";
import { calculatePayrollRun } from "../src/features/payroll-runs/run-calculate-command";
import {
	archivePayrollCalendar,
	createPayrollCalendar,
	listPayrollCalendars,
	updatePayrollCalendar,
} from "../src/features/payroll-setup/calendar";
import {
	createPayrollDeductionRule,
	supersedePayrollDeductionRule,
} from "../src/features/payroll-setup/deduction-rule";
import {
	archivePayrollEarningRule,
	createPayrollEarningRule,
	supersedePayrollEarningRule,
	updatePayrollEarningRule,
} from "../src/features/payroll-setup/earning-rule";
import {
	archivePayrollPayGroup,
	createPayrollPayGroup,
	listPayrollPayGroups,
	updatePayrollPayGroup,
} from "../src/features/payroll-setup/pay-group";
import {
	createPayrollStatutoryRule,
	supersedePayrollStatutoryRule,
} from "../src/features/payroll-setup/statutory-rule";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	parsePayrollResultLineId,
	parsePayrollRunEmployeeId,
} from "../src/kernel/identity/brands";
import {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	PAYROLL_CALCULATION_VERSION,
} from "../src/kernel/money/rounding-policy";
import {
	createMemoryPayrollStore,
	createTestPayrollRunCalculator,
} from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const organizationId = "org-setup-versioning";
const actorUserId = "user-setup-versioning";

const authorization: PayrollAuthorizationPort = {
	can: async () => true,
};

function context(correlationId: string) {
	return { organizationId, actorUserId, correlationId };
}

async function seedSetup(suffix: string) {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const options = { store, ports, authorization };
	const calendar = await createPayrollCalendar(
		{
			...context(`corr-calendar-${suffix}`),
			code: `CAL-${suffix}`,
			name: "Monthly calendar",
			timezone: "UTC",
			effectiveFrom: "2025-01-01",
			idempotencyKey: `idem-calendar-${suffix}`,
		},
		options,
	);
	if (!calendar.ok) {
		throw new Error(calendar.message);
	}
	const payGroup = await createPayrollPayGroup(
		{
			...context(`corr-pay-group-${suffix}`),
			calendarId: calendar.data.id,
			code: `PG-${suffix}`,
			name: "Monthly payroll",
			currencyCode: "USD",
			idempotencyKey: `idem-pay-group-${suffix}`,
		},
		options,
	);
	if (!payGroup.ok) {
		throw new Error(payGroup.message);
	}
	return { calendar: calendar.data, options, payGroup: payGroup.data, store };
}

describe("payroll setup lifecycle and versioning", () => {
	it("supports governed calendar, pay-group, and period lifecycle operations", async () => {
		const seeded = await seedSetup("lifecycle");
		const calendar = await updatePayrollCalendar(
			{
				...context("corr-calendar-update"),
				calendarId: seeded.calendar.id,
				name: "Updated calendar",
				expectedVersion: seeded.calendar.version,
			},
			seeded.options,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) {
			return;
		}

		const payGroup = await updatePayrollPayGroup(
			{
				...context("corr-pay-group-update"),
				payGroupId: seeded.payGroup.id,
				name: "Updated payroll",
				expectedVersion: seeded.payGroup.version,
			},
			seeded.options,
		);
		expect(payGroup.ok).toBe(true);
		if (!payGroup.ok) {
			return;
		}

		const period = await createPayrollPeriod(
			{
				...context("corr-period-create"),
				payGroupId: payGroup.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
				cutoffDate: "2025-01-28",
				idempotencyKey: "idem-period-lifecycle",
			},
			seeded.options,
		);
		expect(period.ok).toBe(true);
		if (!period.ok) {
			return;
		}

		const updatedPeriod = await updatePayrollPeriod(
			{
				...context("corr-period-update"),
				periodId: period.data.id,
				cutoffDate: "2025-01-27",
				expectedVersion: period.data.version,
			},
			seeded.options,
		);
		expect(updatedPeriod.ok).toBe(true);
		if (!updatedPeriod.ok) {
			return;
		}

		const closed = await closePayrollPeriod(
			{
				...context("corr-period-close"),
				periodId: updatedPeriod.data.id,
				expectedVersion: updatedPeriod.data.version,
			},
			seeded.options,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) {
			return;
		}
		expect(closed.data.status).toBe("closed");

		const loaded = await getPayrollPeriod(
			{ ...context("corr-period-get"), periodId: closed.data.id },
			seeded.options,
		);
		expect(loaded.ok && loaded.data?.status).toBe("closed");
		const periods = await listPayrollPeriods(
			{
				...context("corr-period-list"),
				payGroupId: payGroup.data.id,
				status: "closed",
			},
			seeded.options,
		);
		expect(periods.ok && periods.data).toHaveLength(1);

		const archivedPayGroup = await archivePayrollPayGroup(
			{
				...context("corr-pay-group-archive"),
				payGroupId: payGroup.data.id,
				expectedVersion: payGroup.data.version,
			},
			seeded.options,
		);
		expect(archivedPayGroup.ok && archivedPayGroup.data.status).toBe(
			"archived",
		);
		const archivedCalendar = await archivePayrollCalendar(
			{
				...context("corr-calendar-archive"),
				calendarId: calendar.data.id,
				expectedVersion: calendar.data.version,
			},
			seeded.options,
		);
		expect(archivedCalendar.ok && archivedCalendar.data.status).toBe(
			"archived",
		);
		const calendars = await listPayrollCalendars(
			{ ...context("corr-calendar-list"), status: "archived" },
			seeded.options,
		);
		const payGroups = await listPayrollPayGroups(
			{ ...context("corr-pay-group-list"), status: "archived" },
			seeded.options,
		);
		expect(calendars.ok && calendars.data).toHaveLength(1);
		expect(payGroups.ok && payGroups.data).toHaveLength(1);
	});

	it("rejects invalid effective ranges and ambiguous amount/rate rules", async () => {
		const seeded = await seedSetup("validation");
		const invalidRange = await createPayrollEarningRule(
			{
				...context("corr-invalid-range"),
				payGroupId: seeded.payGroup.id,
				code: "INVALID-RANGE",
				name: "Invalid range",
				ruleType: "fixed",
				amount: "100.00",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "1",
				effectiveFrom: "2025-12-31",
				effectiveTo: "2025-01-01",
				idempotencyKey: "idem-invalid-range",
			},
			seeded.options,
		);
		expect(invalidRange.ok).toBe(false);
		if (invalidRange.ok) {
			return;
		}
		expect(invalidRange.code).toBe("VALIDATION_ERROR");

		const ambiguous = await createPayrollEarningRule(
			{
				...context("corr-ambiguous-rule"),
				payGroupId: seeded.payGroup.id,
				code: "AMBIGUOUS",
				name: "Ambiguous rule",
				ruleType: "fixed",
				amount: "100.00",
				rate: "0.10",
				currencyCode: "USD",
				ruleVersion: "1",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-ambiguous-rule",
			},
			seeded.options,
		);
		expect(ambiguous.ok).toBe(false);
		if (ambiguous.ok) {
			return;
		}
		expect(ambiguous.code).toBe("VALIDATION_ERROR");
	});

	it("rejects an update that expands an active rule into another version", async () => {
		const seeded = await seedSetup("update-overlap");
		const first = await createPayrollEarningRule(
			{
				...context("corr-overlap-v1"),
				payGroupId: seeded.payGroup.id,
				code: "OVERTIME",
				name: "Overtime v1",
				ruleType: "rate",
				amount: null,
				rate: "1.25",
				currencyCode: "USD",
				ruleVersion: "1",
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-06-30",
				idempotencyKey: "idem-overlap-v1",
			},
			seeded.options,
		);
		if (!first.ok) {
			throw new Error(first.message);
		}
		const second = await createPayrollEarningRule(
			{
				...context("corr-overlap-v2"),
				payGroupId: seeded.payGroup.id,
				code: "OVERTIME",
				name: "Overtime v2",
				ruleType: "rate",
				amount: null,
				rate: "1.50",
				currencyCode: "USD",
				ruleVersion: "2",
				effectiveFrom: "2025-07-01",
				idempotencyKey: "idem-overlap-v2",
			},
			seeded.options,
		);
		if (!second.ok) {
			throw new Error(second.message);
		}

		const overlap = await updatePayrollEarningRule(
			{
				...context("corr-overlap-update"),
				ruleId: first.data.id,
				effectiveTo: "2025-07-15",
				expectedVersion: first.data.version,
			},
			seeded.options,
		);
		expect(overlap.ok).toBe(false);
		if (overlap.ok) {
			return;
		}
		expect(overlap.code).toBe("CONFLICT");
	});

	it("preserves earning-rule history across update, supersession, and retirement", async () => {
		const seeded = await seedSetup("earning-history");
		const first = await createPayrollEarningRule(
			{
				...context("corr-earning-v1"),
				payGroupId: seeded.payGroup.id,
				code: "BASE",
				name: "Base earning",
				ruleType: "fixed",
				amount: "1000.00",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "1",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-earning-v1",
			},
			seeded.options,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const updated = await updatePayrollEarningRule(
			{
				...context("corr-earning-update"),
				ruleId: first.data.id,
				name: "Base earning updated",
				expectedVersion: first.data.version,
			},
			seeded.options,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}

		const superseded = await supersedePayrollEarningRule(
			{
				...context("corr-earning-v2"),
				ruleId: updated.data.id,
				amount: "1200.00",
				rate: null,
				ruleVersion: "2",
				effectiveFrom: "2025-07-01",
				expectedVersion: updated.data.version,
				idempotencyKey: "idem-earning-v2",
			},
			seeded.options,
		);
		expect(superseded.ok).toBe(true);
		if (!superseded.ok) {
			return;
		}
		expect(superseded.data.superseded.effectiveTo).toBe("2025-06-30");

		const historical = await seeded.store.getEarningRuleAtEffectiveDate({
			organizationId,
			payGroupId: seeded.payGroup.id,
			code: "BASE",
			effectiveDate: "2025-06-30",
		});
		const current = await seeded.store.getEarningRuleAtEffectiveDate({
			organizationId,
			payGroupId: seeded.payGroup.id,
			code: "BASE",
			effectiveDate: "2025-07-01",
		});
		expect(historical.ok && historical.data?.ruleVersion).toBe("1");
		expect(current.ok && current.data?.ruleVersion).toBe("2");

		const archived = await archivePayrollEarningRule(
			{
				...context("corr-earning-archive"),
				ruleId: superseded.data.successor.id,
				expectedVersion: superseded.data.successor.version,
			},
			seeded.options,
		);
		expect(archived.ok && archived.data.status).toBe("archived");
		const retiredLookup = await seeded.store.getEarningRuleAtEffectiveDate({
			organizationId,
			payGroupId: seeded.payGroup.id,
			code: "BASE",
			effectiveDate: "2025-07-01",
		});
		expect(retiredLookup.ok && retiredLookup.data).toBeNull();
	});

	it("applies identical historical supersession to deduction and statutory rules", async () => {
		const seeded = await seedSetup("rule-parity");
		const deduction = await createPayrollDeductionRule(
			{
				...context("corr-deduction-v1"),
				payGroupId: seeded.payGroup.id,
				code: "DEDUCTION",
				name: "Deduction",
				ruleType: "rate",
				amount: null,
				rate: "0.05",
				currencyCode: "USD",
				ruleVersion: "1",
				taxTiming: "post_tax",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-deduction-v1",
			},
			seeded.options,
		);
		if (!deduction.ok) {
			throw new Error(deduction.message);
		}
		const deductionV2 = await supersedePayrollDeductionRule(
			{
				...context("corr-deduction-v2"),
				ruleId: deduction.data.id,
				rate: "0.06",
				amount: null,
				ruleVersion: "2",
				effectiveFrom: "2025-07-01",
				expectedVersion: deduction.data.version,
				idempotencyKey: "idem-deduction-v2",
			},
			seeded.options,
		);
		expect(deductionV2.ok).toBe(true);
		if (!deductionV2.ok) {
			return;
		}
		expect(deductionV2.data.superseded.effectiveTo).toBe("2025-06-30");

		const statutory = await createPayrollStatutoryRule(
			{
				...context("corr-statutory-v1"),
				payGroupId: seeded.payGroup.id,
				code: "STATUTORY",
				name: "Statutory rule",
				jurisdictionCode: "SYNTH",
				configJson: { employeeRate: "0.01" },
				ruleVersion: "1",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-statutory-v1",
			},
			seeded.options,
		);
		if (!statutory.ok) {
			throw new Error(statutory.message);
		}
		const statutoryV2 = await supersedePayrollStatutoryRule(
			{
				...context("corr-statutory-v2"),
				ruleId: statutory.data.id,
				configJson: { employeeRate: "0.02" },
				ruleVersion: "2",
				effectiveFrom: "2025-07-01",
				expectedVersion: statutory.data.version,
				idempotencyKey: "idem-statutory-v2",
			},
			seeded.options,
		);
		expect(statutoryV2.ok).toBe(true);
		if (!statutoryV2.ok) {
			return;
		}
		expect(statutoryV2.data.superseded.effectiveTo).toBe("2025-06-30");

		const deductionHistory = await seeded.store.getDeductionRuleAtEffectiveDate(
			{
				organizationId,
				payGroupId: seeded.payGroup.id,
				code: "DEDUCTION",
				effectiveDate: "2025-06-30",
			},
		);
		const statutoryHistory = await seeded.store.getStatutoryRuleAtEffectiveDate(
			{
				organizationId,
				payGroupId: seeded.payGroup.id,
				code: "STATUTORY",
				effectiveDate: "2025-06-30",
			},
		);
		expect(deductionHistory.ok && deductionHistory.data?.ruleVersion).toBe("1");
		expect(statutoryHistory.ok && statutoryHistory.data?.ruleVersion).toBe("1");
	});

	it("locks rule versions automatically when their calculation snapshot is finalized", async () => {
		const seeded = await seedSetup("finalized-lock");
		const period = await createPayrollPeriod(
			{
				...context("corr-finalized-period"),
				payGroupId: seeded.payGroup.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
				cutoffDate: "2025-01-28",
				idempotencyKey: "idem-finalized-period",
			},
			seeded.options,
		);
		if (!period.ok) {
			throw new Error(period.message);
		}
		const rule = await createPayrollEarningRule(
			{
				...context("corr-finalized-rule"),
				payGroupId: seeded.payGroup.id,
				code: "FINALIZED-BASE",
				name: "Finalized base earning",
				ruleType: "fixed",
				amount: "1000.00",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "1",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-finalized-rule",
			},
			seeded.options,
		);
		if (!rule.ok) {
			throw new Error(rule.message);
		}
		let runOptions = seeded.options;
		const run = await createPayrollRun(
			{
				...context("corr-finalized-run"),
				payGroupId: seeded.payGroup.id,
				periodId: period.data.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-finalized-run",
			},
			runOptions,
		);
		if (!run.ok) {
			throw new Error(run.message);
		}
		const runEmployeeId = parsePayrollRunEmployeeId(randomUUID());
		if (!runEmployeeId.ok) {
			throw new Error(runEmployeeId.message);
		}
		const resultLineId = parsePayrollResultLineId(randomUUID());
		if (!resultLineId.ok) {
			throw new Error(resultLineId.message);
		}
		const snapshotJson = {
			earningRules: [{ id: rule.data.id, recordVersion: rule.data.version }],
			deductionRules: [],
			statutoryRules: [],
		};
		const employeeSnapshotHash = hashSnapshot(snapshotJson);
		const outputs = await seeded.store.replaceRunCalculationOutputs(
			{
				organizationId,
				runId: run.data.id,
				runEmployees: [
					{
						id: runEmployeeId.data,
						employeeId: "employee-finalized-lock",
						assignmentId: null,
						currencyCode: "USD",
						gross: "1000.00",
						employeeDeductions: "0.00",
						employeeStatutory: "0.00",
						employerCost: "0.00",
						net: "1000.00",
						snapshotJson,
						snapshotHash: employeeSnapshotHash,
						calculationVersion: "payroll.calc.v1",
						status: "calculated",
					},
				],
				resultLines: [
					{
						id: resultLineId.data,
						runEmployeeId: runEmployeeId.data,
						employeeId: "employee-finalized-lock",
						lineKind: "earning",
						code: "FINALIZED-BASE",
						ruleCode: "FINALIZED-BASE",
						ruleVersion: "1",
						ruleKind: "earning",
						amount: "1000.00",
						currencyCode: "USD",
						sourceType: "earning_rule",
						sourceId: rule.data.id,
						sequence: 1,
						traceRef: "finalized-lock:1",
					},
				],
				actorUserId,
				correlationId: "corr-finalized-outputs",
			},
			seeded.options.ports,
		);
		if (!outputs.ok) {
			throw new Error(outputs.message);
		}
		runOptions = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator({
				snapshotHash: hashSnapshot({
					runId: run.data.id,
					calculationVersion: PAYROLL_CALCULATION_VERSION,
					roundingPolicy: DEFAULT_PAYROLL_ROUNDING_POLICY,
					snapshotHashes: [employeeSnapshotHash],
				}),
			}),
		};
		const calculated = await calculatePayrollRun(
			{
				...context("corr-finalized-calculate"),
				runId: run.data.id,
				expectedVersion: run.data.version,
			},
			runOptions,
		);
		if (!calculated.ok) {
			throw new Error(calculated.message);
		}
		const finalized = await finalizePayrollRun(
			{
				...context("corr-finalized-finalize"),
				runId: calculated.data.id,
				expectedVersion: calculated.data.version,
			},
			runOptions,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) {
			return;
		}
		const blocked = await updatePayrollEarningRule(
			{
				...context("corr-finalized-update"),
				ruleId: rule.data.id,
				name: "Must remain immutable",
				expectedVersion: rule.data.version,
			},
			seeded.options,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.code).toBe("CONFLICT");
		}
	});
});
