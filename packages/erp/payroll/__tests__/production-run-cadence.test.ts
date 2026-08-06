import { errorResult } from "@afenda/errors";
import {
	deriveHandoffDecimalScale,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
	type HandoffStatutoryProfile,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import { createRegistryPayrollStatutory } from "../src/facade/system-capabilities";
import { createProductionPayrollRunCalculator } from "../src/features/calculation/production-run-calculator";
import { createPayrollEmployeeAssignment } from "../src/features/employee-assignments/employee-payroll-assignment";
import { createPayrollPeriod } from "../src/features/payroll-runs/payroll-period";
import { createPayrollRun } from "../src/features/payroll-runs/payroll-run";
import { createPayrollCalendar } from "../src/features/payroll-setup/calendar";
import { createPayrollPayGroup } from "../src/features/payroll-setup/pay-group";
import { createPayrollStatutoryRule } from "../src/features/payroll-setup/statutory-rule";
import { createPayrollHistoryYearToDateCapability } from "../src/features/statutory-rules/year-to-date-capability";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import type { PayrollStatutoryCapability } from "../src/kernel/execution/capability-ports";
import type {
	PayrollRunCalculatorInput,
	PayrollWorkforceInputPort,
} from "../src/kernel/execution/ports";
import {
	parsePayrollPayGroupId,
	parsePayrollPeriodId,
	parsePayrollRunId,
} from "../src/kernel/identity/brands";
import { createMemoryPayrollStore } from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORGANIZATION_ID = "org-production-cadence";
const ACTOR_ID = "actor-production-cadence";
const EMPLOYEE_ID = "employee-production-cadence";
const BASE_COMPENSATION = "5000";

function unwrap<T>(
	result: { ok: true; data: T } | { ok: false; message: string },
): T {
	if (!result.ok) {
		throw new Error(result.message);
	}
	return result.data;
}

function context() {
	return {
		organizationId: ORGANIZATION_ID,
		actorUserId: ACTOR_ID,
		correlationId: "corr-production-cadence",
	};
}

function authorization(): PayrollAuthorizationPort {
	return { can: async () => true };
}

/** Approves every registered calculator so approval is not the variable under test. */
function approvingStatutory(): PayrollStatutoryCapability {
	const registry = createRegistryPayrollStatutory();
	return {
		isProductionApproved: () => true,
		requireCalculator: registry.requireCalculator,
	};
}

const MY_PROFILE: HandoffStatutoryProfile = {
	dependantCount: 0,
	employeeProvidentFundNumber: null,
	expatriate: false,
	jurisdictionCode: "MY",
	minimumWageZone: null,
	nationalityCountryCode: "MY",
	profileId: "profile-production-cadence",
	reliefDeclarations: [],
	reliefDeclarationVersion: "hr.statutory-relief.v1",
	socialInsuranceBookNumber: null,
	socialSecurityNumber: null,
	sourceVersion: 1,
	taxFileNumber: null,
	taxResidencyStatus: "resident",
};

function workforcePort(): PayrollWorkforceInputPort {
	return {
		// biome-ignore lint/suspicious/useAwait: deterministic double for an async port
		async getApprovedPayrollHandoff(input) {
			return errorResult.ok({
				contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
				organizationId: ORGANIZATION_ID,
				employeeId: EMPLOYEE_ID,
				employmentId: `employment-${EMPLOYEE_ID}`,
				employmentStatus: "active" as const,
				assignment: { assignmentId: `assignment-${EMPLOYEE_ID}` },
				effectiveDate: input.effectiveDate,
				currencyCode: "MYR",
				baseAmount: BASE_COMPENSATION,
				decimalScale: deriveHandoffDecimalScale(BASE_COMPENSATION),
				roundingMode: "half_even",
				payFrequency: "monthly" as const,
				components: [
					{
						code: "base",
						kind: "base" as const,
						amount: BASE_COMPENSATION,
						currencyCode: "MYR",
						decimalScale: deriveHandoffDecimalScale(BASE_COMPENSATION),
						sourceType: "test_employee_compensation",
						sourceId: `compensation-${EMPLOYEE_ID}`,
						sourceVersion: 1,
					},
				],
				statutoryProfile: MY_PROFILE,
				leaveFacts: [],
				timeFacts: null,
				overtimeFacts: [],
				sourceVersion: { compensationVersion: 1 },
				approvalEvidence: {
					approvedAt: "2026-01-01T00:00:00.000Z",
					approvedBy: "test-reviewer",
					correlationId: input.correlationId,
				},
			});
		},
	};
}

interface SeededStatutoryRule {
	code: string;
	configJson: Record<string, unknown>;
	effectiveFrom: string;
	effectiveTo?: string;
}

/**
 * Two monthly periods in one tax year — January (31 days) and February (28) —
 * which is the exact shape that a single-period length inference reads as two
 * different cadences.
 */
async function seedTwoMonthlyPeriods(rules: readonly SeededStatutoryRule[]) {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const options = { store, ports, authorization: authorization() };

	const calendar = unwrap(
		await createPayrollCalendar(
			{
				...context(),
				code: "CAL-CADENCE",
				name: "Cadence calendar",
				timezone: "UTC",
				effectiveFrom: "2026-01-01",
				idempotencyKey: "idem-cal-cadence",
			},
			options,
		),
	);
	const payGroup = unwrap(
		await createPayrollPayGroup(
			{
				...context(),
				calendarId: calendar.id,
				code: "PG-CADENCE",
				name: "Cadence pay group",
				currencyCode: "MYR",
				idempotencyKey: "idem-pg-cadence",
			},
			options,
		),
	);
	const january = unwrap(
		await createPayrollPeriod(
			{
				...context(),
				payGroupId: payGroup.id,
				periodStart: "2026-01-01",
				periodEnd: "2026-01-31",
				cutoffDate: "2026-01-28",
				idempotencyKey: "idem-period-jan",
			},
			options,
		),
	);
	const february = unwrap(
		await createPayrollPeriod(
			{
				...context(),
				payGroupId: payGroup.id,
				periodStart: "2026-02-01",
				periodEnd: "2026-02-28",
				cutoffDate: "2026-02-25",
				idempotencyKey: "idem-period-feb",
			},
			options,
		),
	);
	unwrap(
		await createPayrollEmployeeAssignment(
			{
				...context(),
				employeeId: EMPLOYEE_ID,
				payGroupId: payGroup.id,
				effectiveFrom: "2026-01-01",
				idempotencyKey: "idem-assignment-cadence",
			},
			{ ...options, employees: workforcePort() },
		),
	);
	for (const created of await Promise.all(
		rules.map((rule, index) =>
			createPayrollStatutoryRule(
				{
					...context(),
					payGroupId: payGroup.id,
					code: rule.code,
					name: `Statutory ${rule.code}`,
					jurisdictionCode: "MY",
					configJson: rule.configJson,
					ruleVersion: "v1",
					effectiveFrom: rule.effectiveFrom,
					...(rule.effectiveTo === undefined
						? {}
						: { effectiveTo: rule.effectiveTo }),
					idempotencyKey: `idem-statutory-${index}`,
				},
				options,
			),
		),
	)) {
		unwrap(created);
	}

	const run = unwrap(
		await createPayrollRun(
			{
				...context(),
				payGroupId: payGroup.id,
				periodId: february.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-cadence",
			},
			options,
		),
	);

	return { february, january, payGroup, ports, run, store };
}

async function calculateFebruary(
	seeded: Awaited<ReturnType<typeof seedTwoMonthlyPeriods>>,
) {
	const calculator = createProductionPayrollRunCalculator({
		store: seeded.store,
		employees: workforcePort(),
		currency: {
			payableRounding: () => errorResult.ok({ scale: 2, mode: "half_even" }),
			payableScale: () => errorResult.ok(2),
		},
		statutory: approvingStatutory(),
		clock: {
			now: () => new Date("2026-02-28T00:00:00.000Z"),
			today: () => "2026-02-28",
		},
		yearToDate: createPayrollHistoryYearToDateCapability(seeded.store),
	});
	const runId = unwrap(parsePayrollRunId(seeded.run.id));
	const calcInput: PayrollRunCalculatorInput = {
		actorUserId: ACTOR_ID,
		correlationId: "corr-production-cadence",
		organizationId: ORGANIZATION_ID,
		payGroupId: unwrap(parsePayrollPayGroupId(seeded.payGroup.id)),
		periodId: unwrap(parsePayrollPeriodId(seeded.february.id)),
		runId,
		runType: "regular",
		sequence: 1,
	};
	const result = await calculator.calculate(calcInput, seeded.ports);
	return { result, runId };
}

const PCB_CONFIG = {
	calculatorId: "my.pcb.v1",
	baseKind: "taxable",
	basis: "cumulative_annualized",
	brackets: [
		{ fromInclusive: "0", toExclusive: "12000", rate: "0" },
		{ fromInclusive: "12000", toExclusive: null, rate: "0.1" },
	],
	personalRelief: "0",
};

const EPF_CONFIG = {
	calculatorId: "my.epf.v1",
	baseKind: "gross",
	bands: [
		{
			wageFromInclusive: "0",
			wageToExclusive: null,
			employeeAmount: "550",
			employerAmount: "650",
		},
	],
};

describe("production run calculator wires period cadence from the tax-year sequence", () => {
	/**
	 * February 2026 is the SECOND monthly period of the tax year, so ten remain
	 * after it plus itself — eleven.
	 *   projected annual = 0 year to date + 11 × 5000 = 55000
	 *   annual tax       = 0.1 × (55000 − 12000) = 4300
	 *   this period      = 4300 ÷ 11 = 390.909090909091 → 390.91 at scale 2
	 * A per-period length inference would read February's 28 days as thirteen
	 * periods a year, take twelve remaining, and withhold a different number.
	 */
	it("prices February's annualized withholding off 12 periods a year, not the 13 its own length implies", async () => {
		const seeded = await seedTwoMonthlyPeriods([
			{
				code: "PCB",
				configJson: PCB_CONFIG,
				effectiveFrom: "2026-01-01",
			},
		]);
		const { result, runId } = await calculateFebruary(seeded);

		if (!result.ok) {
			throw new Error(`${result.code}: ${result.message}`);
		}
		expect(result.data.exceptions).toEqual([]);

		const statutory = unwrap(
			await seeded.store.listStatutoryResultsForRun({
				organizationId: ORGANIZATION_ID,
				runId,
			}),
		);
		expect(statutory.map((entry) => entry.employeeAmount)).toEqual(["390.91"]);

		const [runEmployee] = unwrap(
			await seeded.store.listRunEmployeesForRun({
				organizationId: ORGANIZATION_ID,
				runId,
			}),
		);
		expect(
			(runEmployee?.snapshotJson as { periodCadence?: unknown } | undefined)
				?.periodCadence,
		).toEqual({ periodOrdinal: 2, periodsPerYear: 12 });
	});

	it("blocks a partial lapse: EPF still active while PCB expired at the year's first period", async () => {
		const seeded = await seedTwoMonthlyPeriods([
			{ code: "EPF", configJson: EPF_CONFIG, effectiveFrom: "2026-01-01" },
			{
				code: "PCB",
				configJson: PCB_CONFIG,
				effectiveFrom: "2026-01-01",
				effectiveTo: "2026-01-31",
			},
		]);
		const { result, runId } = await calculateFebruary(seeded);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(
			result.data.exceptions.map((entry) => ({
				exceptionCode: entry.exceptionCode,
				severity: entry.severity,
			})),
		).toEqual([
			{ exceptionCode: "LAPSED_STATUTORY_RULE", severity: "blocking" },
		]);
		expect(result.data.exceptions[0]?.message).toContain("my.pcb.v1");

		// The EPF rule that IS still active must not be priced either: the run
		// refuses the subject rather than paying a partially-withheld payslip.
		expect(
			unwrap(
				await seeded.store.listStatutoryResultsForRun({
					organizationId: ORGANIZATION_ID,
					runId,
				}),
			),
		).toEqual([]);
	});
});
