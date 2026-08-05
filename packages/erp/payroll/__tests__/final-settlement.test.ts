import { errorResult } from "@afenda/errors";
import type { ApprovedPayrollHandoff } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import { createRegistryPayrollStatutory } from "../src/facade/system-capabilities";
import {
	calculateFinalSettlement,
	finalizeFinalSettlement,
	initiateFinalSettlement,
} from "../src/features/final-settlement/settlement.command";
import {
	getFinalSettlementStatement,
	getOwnFinalSettlementStatement,
} from "../src/features/final-settlement/settlement-statement";
import {
	closePayrollPeriod,
	createPayrollPeriod,
} from "../src/features/payroll-runs/payroll-period";
import { createPayrollRun } from "../src/features/payroll-runs/payroll-run";
import { createPayrollCalendar } from "../src/features/payroll-setup/calendar";
import { createPayrollPayGroup } from "../src/features/payroll-setup/pay-group";
import { createPayrollStatutoryRule } from "../src/features/payroll-setup/statutory-rule";
import { createAcceptedWorkforceInputPort } from "../src/features/workforce-ingress/accepted-workforce-input-port";
import { ingestApprovedPayrollHandoff } from "../src/features/workforce-ingress/ingest-approved-handoff";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import type { PayrollStatutoryCapability } from "../src/kernel/execution/capability-ports";
import {
	PAYROLL_PERMISSION_INPUT_MANAGE,
	PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
	PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_SETUP_MANAGE,
} from "../src/kernel/execution/permissions";
import type { PayrollWorkforceInputPort } from "../src/kernel/execution/ports";
import type {
	PayrollPeriodId,
	PayrollRunId,
} from "../src/kernel/identity/brands";
import { createMemoryPayrollStore } from "../src/testing/index";
import { buildSyntheticHandoff } from "./fixtures/approved-payroll-handoff-fixtures";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORGANIZATION_ID = "org-payroll-final-settlement";
const ACTOR_ID = "actor-payroll-final-settlement";
const CALCULATOR_ID = "actor-payroll-final-settlement-calc";
const FINALIZER_ID = "actor-payroll-final-settlement-finalizer";
const READER_ID = "actor-payroll-final-settlement-reader";
const SUBJECT_ACTOR_ID = "actor-payroll-final-settlement-subject";
const OTHER_SUBJECT_ACTOR_ID = "actor-payroll-final-settlement-other-subject";
const EMPLOYEE_ID = "emp-payroll-final-001";
const OTHER_EMPLOYEE_ID = "emp-payroll-final-002";
const CORRELATION_ID = "corr-payroll-final-settlement";

const PERIOD_START = "2025-01-01";
const PERIOD_END = "2025-01-31";
const TERMINATION_ON = "2025-01-15";

const PERMISSIONS = [
	PAYROLL_PERMISSION_SETUP_MANAGE,
	PAYROLL_PERMISSION_INPUT_MANAGE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
	PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
];

function authorization(
	permissions: readonly string[],
): PayrollAuthorizationPort {
	return { can: async ({ permission }) => permissions.includes(permission) };
}

function context(actorUserId = ACTOR_ID) {
	return {
		organizationId: ORGANIZATION_ID,
		actorUserId,
		correlationId: CORRELATION_ID,
	};
}

function unwrap<T>(
	result: { ok: true; data: T } | { ok: false; message: string },
): T {
	if (!result.ok) {
		throw new Error(result.message);
	}
	return result.data;
}

/**
 * Approves the registered calculator for production without mutating the
 * package registry, so production approval is the only difference between a
 * payable settlement and a refused one.
 */
function approvingStatutory(): PayrollStatutoryCapability {
	const registry = createRegistryPayrollStatutory();
	return {
		isProductionApproved: () => true,
		requireCalculator: registry.requireCalculator,
	};
}

function terminationHandoff(
	overrides: Partial<ApprovedPayrollHandoff> = {},
): ApprovedPayrollHandoff {
	const baseAmount = overrides.baseAmount ?? "3100";
	return buildSyntheticHandoff({
		organizationId: ORGANIZATION_ID,
		employeeId: EMPLOYEE_ID,
		employmentId: `employment-${EMPLOYEE_ID}`,
		employmentStatus: "notice",
		effectiveDate: TERMINATION_ON,
		leaveBalanceAtTermination: {
			asOf: TERMINATION_ON,
			days: "2",
		},
		baseAmount,
		decimalScale: 0,
		components: [
			{
				code: "base",
				kind: "base",
				amount: baseAmount,
				currencyCode: "USD",
				decimalScale: 0,
				sourceType: "hr_employee_compensation",
				sourceId: `comp-${EMPLOYEE_ID}`,
				sourceVersion: 1,
			},
		],
		...overrides,
	});
}

function employeesPort(store: unknown): PayrollWorkforceInputPort {
	const actorEmployees = new Map([
		[SUBJECT_ACTOR_ID, EMPLOYEE_ID],
		[OTHER_SUBJECT_ACTOR_ID, OTHER_EMPLOYEE_ID],
	]);
	return {
		...createAcceptedWorkforceInputPort(
			store as Parameters<typeof createAcceptedWorkforceInputPort>[0],
		),
		resolveActorEmployeeId: async ({ actorUserId }) =>
			errorResult.ok(actorEmployees.get(actorUserId) ?? null),
	};
}

async function seedOpenPeriod(
	seedOptions: {
		handoff?: ApprovedPayrollHandoff;
		statutory?: PayrollStatutoryCapability;
	} = {},
) {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const options = {
		store,
		ports,
		authorization: authorization(PERMISSIONS),
		employees: employeesPort(store),
		statutory: seedOptions.statutory ?? approvingStatutory(),
	};
	const calendar = unwrap(
		await createPayrollCalendar(
			{
				...context(),
				code: "CAL-FINAL",
				name: "Final settlement calendar",
				timezone: "UTC",
				effectiveFrom: PERIOD_START,
				idempotencyKey: "idem-cal-final",
			},
			options,
		),
	);
	const payGroup = unwrap(
		await createPayrollPayGroup(
			{
				...context(),
				calendarId: calendar.id,
				code: "PG-FINAL",
				name: "Final settlement pay group",
				currencyCode: "USD",
				idempotencyKey: "idem-pg-final",
			},
			options,
		),
	);
	const period = unwrap(
		await createPayrollPeriod(
			{
				...context(),
				payGroupId: payGroup.id,
				periodStart: PERIOD_START,
				periodEnd: PERIOD_END,
				cutoffDate: "2025-01-28",
				idempotencyKey: "idem-period-final",
			},
			options,
		),
	);
	unwrap(
		await createPayrollStatutoryRule(
			{
				...context(),
				payGroupId: payGroup.id,
				code: "SOC",
				name: "Social contribution",
				jurisdictionCode: "MY",
				configJson: {
					calculatorId: "synth.v1",
					baseKind: "gross",
					employeeRate: "0.05",
					employerRate: "0.10",
				},
				ruleVersion: "v1",
				effectiveFrom: PERIOD_START,
				idempotencyKey: "idem-statutory-final",
			},
			options,
		),
	);
	unwrap(
		await ingestApprovedPayrollHandoff(
			{
				...context(),
				idempotencyKey: "idem-handoff-final-1",
				periodStart: PERIOD_START,
				periodEnd: PERIOD_END,
				payload: seedOptions.handoff ?? terminationHandoff(),
			},
			options,
		),
	);
	return { options, payGroupId: payGroup.id, periodId: period.id, store };
}

type Seeded = Awaited<ReturnType<typeof seedOpenPeriod>>;

function initiateInput(
	seeded: Seeded,
	overrides: Record<string, unknown> = {},
) {
	return {
		...context(),
		employeeId: EMPLOYEE_ID,
		idempotencyKey: "idem-final-1",
		noticeInLieuAmount: "200",
		noticePayAmount: "300",
		payGroupId: seeded.payGroupId,
		periodId: seeded.periodId,
		recoveries: [
			{ amount: "50", code: "ADVANCE", reason: "Unrecovered salary advance" },
		],
		terminationEffectiveOn: TERMINATION_ON,
		terminationId: "term-final-001",
		...overrides,
	};
}

async function supersedeCompensation(
	seeded: Seeded,
	baseAmount: string,
): Promise<void> {
	unwrap(
		await ingestApprovedPayrollHandoff(
			{
				...context(),
				idempotencyKey: "idem-handoff-final-2",
				periodStart: PERIOD_START,
				periodEnd: PERIOD_END,
				payload: terminationHandoff({
					baseAmount,
					components: [
						{
							code: "base",
							kind: "base",
							amount: baseAmount,
							currencyCode: "USD",
							decimalScale: 0,
							sourceType: "hr_employee_compensation",
							sourceId: `comp-${EMPLOYEE_ID}`,
							sourceVersion: 2,
						},
					],
					sourceVersion: { compensationVersion: 2 },
				}),
			},
			seeded.options,
		),
	);
}

async function initiated(seeded: Seeded) {
	return unwrap(
		await initiateFinalSettlement(initiateInput(seeded), seeded.options),
	);
}

async function calculated(seeded: Seeded) {
	const current = await initiated(seeded);
	return unwrap(
		await calculateFinalSettlement(
			{
				...context(CALCULATOR_ID),
				expectedVersion: current.version,
				settlementId: current.id,
			},
			seeded.options,
		),
	);
}

async function finalized(seeded: Seeded) {
	const current = await calculated(seeded);
	return unwrap(
		await finalizeFinalSettlement(
			{
				...context(FINALIZER_ID),
				expectedVersion: current.settlement.version,
				settlementId: current.settlement.id,
			},
			seeded.options,
		),
	);
}

describe("final-settlement initiate", () => {
	it("pins compensation from the accepted handoff instead of caller input", async () => {
		const seeded = await seedOpenPeriod();
		const current = await initiated(seeded);

		expect(current.status).toBe("initiated");
		expect(current.compensationSnapshot.baseCompensation).toBe("3100");
		expect(current.compensationSnapshot.currencyCode).toBe("USD");
		expect(current.compensationSnapshot.employmentStatus).toBe("notice");
		expect(current.compensationSnapshot.effectiveDate).toBe(TERMINATION_ON);
		expect(current.compensationSnapshot.sourceVersion).toEqual({
			compensationVersion: 1,
		});
		expect(current.compensationSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
		// The HR-delivered balance is carried verbatim, never derived by payroll.
		expect(current.facts.leaveBalanceDays).toBe("2");
		expect(current.compensationSnapshot.yearToDate).toEqual({
			currencyCode: "USD",
			employeeStatutory: "0",
			employerStatutory: "0",
			gross: "0",
			taxYear: 2025,
			taxableBase: "0",
		});
		expect(current.compensationSnapshot.priorEmployerYtd).toEqual([]);
		expect(current.compensationSnapshot.statutoryProfile).toBeNull();
		expect(current.totals).toBeNull();
		expect(current.statutoryEvidence).toBeNull();
		// First test in the file absorbs cold module initialization.
	}, 30_000);

	it("refuses when the termination handoff omits a closing leave balance", async () => {
		const seeded = await seedOpenPeriod({
			handoff: terminationHandoff({ leaveBalanceAtTermination: undefined }),
		});
		const result = await initiateFinalSettlement(
			initiateInput(seeded),
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(result.message).toContain("closing leave balance");
		}
	});

	it("pins year-to-date totals from payroll history at initiate", async () => {
		const seeded = await seedOpenPeriod();
		const result = await initiateFinalSettlement(initiateInput(seeded), {
			...seeded.options,
			yearToDate: {
				employeeTotals: async () =>
					errorResult.ok({
						currencyCode: "USD",
						employeeStatutory: "80",
						employerStatutory: "40",
						gross: "9000",
						taxYear: 2025,
						taxableBase: "8100",
					}),
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.compensationSnapshot.yearToDate).toEqual({
			currencyCode: "USD",
			employeeStatutory: "80",
			employerStatutory: "40",
			gross: "9000",
			taxYear: 2025,
			taxableBase: "8100",
		});
	});

	it("refuses an employee with no HR termination fact", async () => {
		const seeded = await seedOpenPeriod({
			handoff: terminationHandoff({ employmentStatus: "active" }),
		});
		const result = await initiateFinalSettlement(
			initiateInput(seeded),
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(result.message).toContain("no HR termination fact");
		}
	});

	it("refuses when no approved handoff covers the termination date", async () => {
		const seeded = await seedOpenPeriod();
		const result = await initiateFinalSettlement(
			initiateInput(seeded, { terminationEffectiveOn: "2025-01-20" }),
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("NOT_FOUND");
		}
	});

	it("returns the same settlement for matching initiate idempotency", async () => {
		const seeded = await seedOpenPeriod();
		const first = await initiated(seeded);
		const second = unwrap(
			await initiateFinalSettlement(initiateInput(seeded), seeded.options),
		);

		expect(second.id).toBe(first.id);
		expect(second.version).toBe(first.version);
	});

	it("fails with CONFLICT when the same key carries a changed payload", async () => {
		const seeded = await seedOpenPeriod();
		await initiated(seeded);
		const conflicting = await initiateFinalSettlement(
			initiateInput(seeded, { noticePayAmount: "999" }),
			seeded.options,
		);

		expect(conflicting.ok).toBe(false);
		if (!conflicting.ok) {
			expect(conflicting.code).toBe("CONFLICT");
		}
	});
});

describe("final-settlement calculate", () => {
	it("prices pro-ration, delivered leave encashment, and calculator statutory", async () => {
		const seeded = await seedOpenPeriod();
		const current = await calculated(seeded);

		expect(current.settlement.status).toBe("calculated");
		expect(current.lines.map((line) => line.kind)).toEqual([
			"prorated_base",
			"leave_encashment",
			"notice_pay",
			"notice_in_lieu",
			"recovery",
			"employee_statutory",
			"employer_statutory",
		]);
		// 3100 over 31 period days = 100/day; 15 worked days (Jan 1-15 inclusive).
		expect(current.lines[0]?.amount).toBe("1500");
		// 2 HR-delivered balance days at the same pinned daily rate.
		expect(current.lines[1]?.amount).toBe("200");
		// gross 2200 at synth.v1 employee 5% / employer 10%.
		expect(current.lines[5]?.amount).toBe("110");
		expect(current.lines[6]?.amount).toBe("220");
		expect(current.settlement.totals).toEqual({
			employeeStatutory: "110",
			employerStatutory: "220",
			gross: "2200",
			net: "2040",
			recoveries: "50",
		});
		expect(current.settlement.statutoryEvidence).toEqual([
			{
				baseAmount: "2200",
				calculatorId: "synth.v1",
				employeeAmount: "110",
				employerAmount: "220",
				jurisdictionCode: "MY",
				ruleCode: "SOC",
				ruleVersion: "v1",
			},
		]);
	});

	it("prices from the pinned snapshot after a live compensation change", async () => {
		const seeded = await seedOpenPeriod();
		const current = await initiated(seeded);

		// HR doubles compensation after the settlement was initiated.
		await supersedeCompensation(seeded, "6200");

		const result = unwrap(
			await calculateFinalSettlement(
				{
					...context(CALCULATOR_ID),
					expectedVersion: current.version,
					settlementId: current.id,
				},
				seeded.options,
			),
		);

		expect(result.settlement.compensationSnapshot.baseCompensation).toBe(
			"3100",
		);
		expect(result.lines[0]?.amount).toBe("1500");
		expect(result.lines[1]?.amount).toBe("200");
		expect(result.settlement.totals?.gross).toBe("2200");
	});

	it("refuses a stale expected version", async () => {
		const seeded = await seedOpenPeriod();
		const current = await initiated(seeded);
		const result = await calculateFinalSettlement(
			{
				...context(CALCULATOR_ID),
				expectedVersion: current.version + 1,
				settlementId: current.id,
			},
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
		}
	});

	it("hides a settlement belonging to another organization", async () => {
		const seeded = await seedOpenPeriod();
		const current = await initiated(seeded);
		const result = await calculateFinalSettlement(
			{
				...context(CALCULATOR_ID),
				organizationId: "org-other-tenant",
				expectedVersion: current.version,
				settlementId: current.id,
			},
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("NOT_FOUND");
			expect(result.message).not.toContain(EMPLOYEE_ID);
		}
	});
});

describe("final-settlement statutory treatment is fail-closed", () => {
	it("refuses when the configured calculator is not production approved", async () => {
		const seeded = await seedOpenPeriod({
			statutory: createRegistryPayrollStatutory(),
		});
		const current = await initiated(seeded);
		const result = await calculateFinalSettlement(
			{
				...context(CALCULATOR_ID),
				expectedVersion: current.version,
				settlementId: current.id,
			},
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(result.message).toContain("not approved for production");
		}
	});

	it("refuses when no statutory capability is wired at all", async () => {
		const seeded = await seedOpenPeriod();
		const current = await initiated(seeded);
		const { statutory: _statutory, ...withoutStatutory } = seeded.options;
		const result = await calculateFinalSettlement(
			{
				...context(CALCULATOR_ID),
				expectedVersion: current.version,
				settlementId: current.id,
			},
			withoutStatutory,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(result.message).toContain("not approved for production");
		}
	});
});

describe("final-settlement finalize", () => {
	it("refuses the calculating actor (C9 segregation of duties)", async () => {
		const seeded = await seedOpenPeriod();
		const current = await calculated(seeded);
		const result = await finalizeFinalSettlement(
			{
				...context(CALCULATOR_ID),
				expectedVersion: current.settlement.version,
				settlementId: current.settlement.id,
			},
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(result.message).toContain("Segregation of duties");
		}
	});

	it("finalizes for a second actor", async () => {
		const seeded = await seedOpenPeriod();
		const current = await finalized(seeded);

		expect(current.status).toBe("finalized");
		expect(current.finalizedBy).toBe(FINALIZER_ID);
	});

	it("refuses to finalize a settlement that was never calculated", async () => {
		const seeded = await seedOpenPeriod();
		const current = await initiated(seeded);
		const result = await finalizeFinalSettlement(
			{
				...context(FINALIZER_ID),
				expectedVersion: current.version,
				settlementId: current.id,
			},
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(result.message).toContain("has not been calculated");
		}
	});
});

describe("final-settlement statement", () => {
	it("discloses the subject's own statement under payroll.payslip.read-own", async () => {
		const seeded = await seedOpenPeriod();
		const current = await finalized(seeded);
		const statement = unwrap(
			await getOwnFinalSettlementStatement(
				{
					actorUserId: SUBJECT_ACTOR_ID,
					organizationId: ORGANIZATION_ID,
					settlementId: current.id,
				},
				seeded.options,
			),
		);

		expect(statement.employeeId).toBe(EMPLOYEE_ID);
		expect(statement.status).toBe("finalized");
		expect(statement.totals.net).toBe("2040");
		expect(statement.terminationId).toBe("term-final-001");
		expect(statement.lines).toHaveLength(7);
		expect(statement.contentHash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("refuses read-own for another subject's settlement", async () => {
		const seeded = await seedOpenPeriod();
		const current = await finalized(seeded);
		const result = await getOwnFinalSettlementStatement(
			{
				actorUserId: OTHER_SUBJECT_ACTOR_ID,
				organizationId: ORGANIZATION_ID,
				settlementId: current.id,
			},
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("NOT_FOUND");
			expect(result.message).not.toContain(EMPLOYEE_ID);
		}
	});

	it("refuses read-own without payroll.payslip.read-own", async () => {
		const seeded = await seedOpenPeriod();
		const current = await finalized(seeded);
		const result = await getOwnFinalSettlementStatement(
			{
				actorUserId: SUBJECT_ACTOR_ID,
				organizationId: ORGANIZATION_ID,
				settlementId: current.id,
			},
			{
				...seeded.options,
				authorization: authorization(
					PERMISSIONS.filter(
						(permission) => permission !== PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
					),
				),
			},
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("FORBIDDEN");
		}
	});

	it("discloses any subject under payroll.payslip.read-all", async () => {
		const seeded = await seedOpenPeriod();
		const current = await finalized(seeded);
		const statement = unwrap(
			await getFinalSettlementStatement(
				{
					actorUserId: READER_ID,
					organizationId: ORGANIZATION_ID,
					settlementId: current.id,
				},
				seeded.options,
			),
		);

		expect(statement.employeeId).toBe(EMPLOYEE_ID);
		expect(statement.settlementId).toBe(current.id);
	});

	it("refuses read-all without payroll.payslip.read-all", async () => {
		const seeded = await seedOpenPeriod();
		const current = await finalized(seeded);
		const result = await getFinalSettlementStatement(
			{
				actorUserId: READER_ID,
				organizationId: ORGANIZATION_ID,
				settlementId: current.id,
			},
			{
				...seeded.options,
				authorization: authorization(
					PERMISSIONS.filter(
						(permission) => permission !== PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
					),
				),
			},
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("FORBIDDEN");
		}
	});

	it("refuses a statement before finalization", async () => {
		const seeded = await seedOpenPeriod();
		const current = await calculated(seeded);
		const result = await getFinalSettlementStatement(
			{
				actorUserId: READER_ID,
				organizationId: ORGANIZATION_ID,
				settlementId: current.settlement.id,
			},
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(result.message).toContain("only after finalization");
		}
	});

	it("hides a statement belonging to another organization", async () => {
		const seeded = await seedOpenPeriod();
		const current = await finalized(seeded);
		const result = await getFinalSettlementStatement(
			{
				actorUserId: READER_ID,
				organizationId: "org-other-tenant",
				settlementId: current.id,
			},
			seeded.options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("NOT_FOUND");
		}
	});
});

describe("final-settlement C6 human clearance", () => {
	it("requires clearance when the origin run is already calculating", async () => {
		const seeded = await seedOpenPeriod();
		const run = unwrap(
			await createPayrollRun(
				{
					...context(),
					payGroupId: seeded.payGroupId,
					periodId: seeded.periodId,
					runType: "regular",
					sequence: 1,
					idempotencyKey: "idem-run-final-lock",
				},
				seeded.options,
			),
		);
		const calculating = unwrap(
			await seeded.store.updateRunWithVersion(
				{
					actorUserId: ACTOR_ID,
					correlationId: CORRELATION_ID,
					expectedVersion: run.version,
					organizationId: ORGANIZATION_ID,
					runId: run.id,
					status: "calculating",
				},
				seeded.options.ports,
			),
		);

		const current = unwrap(
			await initiateFinalSettlement(
				initiateInput(seeded, { originRunId: run.id as PayrollRunId }),
				seeded.options,
			),
		);
		expect(current.status).toBe("clearance_required");
		expect(current.clearanceRequiredReason).toContain("origin run was locked");

		const blocked = await calculateFinalSettlement(
			{
				...context(CALCULATOR_ID),
				expectedVersion: current.version,
				settlementId: current.id,
			},
			seeded.options,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.message).toContain("Human clearance is required");
		}

		const cleared = unwrap(
			await calculateFinalSettlement(
				{
					...context(CALCULATOR_ID),
					clearanceReason: "Payroll ops cleared mid-period termination",
					expectedVersion: current.version,
					settlementId: current.id,
				},
				seeded.options,
			),
		);
		expect(cleared.settlement.status).toBe("calculated");
		expect(cleared.settlement.clearanceReason).toContain("cleared");

		// The locked origin run is never mutated by the settlement.
		const origin = unwrap(
			await seeded.store.getRun({
				organizationId: ORGANIZATION_ID,
				runId: run.id,
			}),
		);
		expect(origin?.status).toBe("calculating");
		expect(origin?.version).toBe(calculating.version);
	});

	it("requires clearance when the period is already closed", async () => {
		const seeded = await seedOpenPeriod();
		const period = unwrap(
			await seeded.store.getPeriod({
				organizationId: ORGANIZATION_ID,
				periodId: seeded.periodId as PayrollPeriodId,
			}),
		);
		if (period === null) {
			throw new Error("seeded period missing");
		}
		unwrap(
			await closePayrollPeriod(
				{
					...context(),
					expectedVersion: period.version,
					periodId: seeded.periodId,
				},
				seeded.options,
			),
		);

		const current = await initiated(seeded);
		expect(current.status).toBe("clearance_required");
		expect(current.clearanceRequiredReason).toContain("period was closed");
	});
});

describe("final-settlement initiate replay", () => {
	it("returns the same settlement when HR supersedes compensation between attempts", async () => {
		const seeded = await seedOpenPeriod();
		const first = await initiated(seeded);

		await supersedeCompensation(seeded, "6200");

		const retry = await initiateFinalSettlement(
			initiateInput(seeded),
			seeded.options,
		);
		expect(retry.ok).toBe(true);
		if (!retry.ok) {
			return;
		}
		expect(retry.data.id).toBe(first.id);
		expect(retry.data.version).toBe(first.version);
		expect(retry.data.compensationSnapshotHash).toBe(
			first.compensationSnapshotHash,
		);
		expect(retry.data.compensationSnapshot).toEqual(first.compensationSnapshot);
	});

	it("refuses a caller-supplied statutory amount", async () => {
		const seeded = await seedOpenPeriod();
		const result = await initiateFinalSettlement(
			initiateInput(seeded, { employeeStatutoryAmount: "120" }),
			seeded.options,
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
	});
});
