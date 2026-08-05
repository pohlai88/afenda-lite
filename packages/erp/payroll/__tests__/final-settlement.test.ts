import { describe, expect, it } from "vitest";

import {
	calculateFinalSettlement,
	finalizeFinalSettlement,
	initiateFinalSettlement,
	issueFinalSettlementStatement,
} from "../src/features/final-settlement/settlement.command";
import {
	closePayrollPeriod,
	createPayrollPeriod,
} from "../src/features/payroll-runs/payroll-period";
import { createPayrollRun } from "../src/features/payroll-runs/payroll-run";
import { createPayrollCalendar } from "../src/features/payroll-setup/calendar";
import { createPayrollPayGroup } from "../src/features/payroll-setup/pay-group";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_SETUP_MANAGE,
} from "../src/kernel/execution/permissions";
import type {
	PayrollPeriodId,
	PayrollRunId,
} from "../src/kernel/identity/brands";
import { createMemoryPayrollStore } from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORGANIZATION_ID = "org-payroll-final-settlement";
const ACTOR_ID = "actor-payroll-final-settlement";
const CALCULATOR_ID = "actor-payroll-final-settlement-calc";
const FINALIZER_ID = "actor-payroll-final-settlement-finalizer";
const REVIEWER_ID = "actor-payroll-final-settlement-reviewer";
const EMPLOYEE_ID = "emp-payroll-final-001";
const CORRELATION_ID = "corr-payroll-final-settlement";

const PERMISSIONS = [
	PAYROLL_PERMISSION_SETUP_MANAGE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_RUN_FINALIZE,
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

async function seedOpenPeriod() {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const options = {
		store,
		ports,
		authorization: authorization(PERMISSIONS),
	};
	const calendar = unwrap(
		await createPayrollCalendar(
			{
				...context(),
				code: "CAL-FINAL",
				name: "Final settlement calendar",
				timezone: "UTC",
				effectiveFrom: "2025-01-01",
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
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
				cutoffDate: "2025-01-28",
				idempotencyKey: "idem-period-final",
			},
			options,
		),
	);
	return { options, payGroupId: payGroup.id, periodId: period.id, store };
}

function initiateInput(seeded: Awaited<ReturnType<typeof seedOpenPeriod>>) {
	return {
		...context(),
		baseCompensation: "3100",
		currencyCode: "USD",
		employeeId: EMPLOYEE_ID,
		employeeStatutoryAmount: "100",
		employerStatutoryAmount: "50",
		idempotencyKey: "idem-final-1",
		leaveBalanceDays: "2",
		noticeInLieuAmount: "200",
		noticePayAmount: "300",
		payGroupId: seeded.payGroupId,
		periodId: seeded.periodId,
		recoveries: [
			{ amount: "50", code: "ADVANCE", reason: "Unrecovered salary advance" },
		],
		terminationEffectiveOn: "2025-01-15",
		terminationId: "term-final-001",
	};
}

describe("final-settlement", () => {
	it("initiates, calculates pro-rata facts, finalizes with SoD, and issues a statement", async () => {
		const seeded = await seedOpenPeriod();
		const initiated = unwrap(
			await initiateFinalSettlement(initiateInput(seeded), seeded.options),
		);
		expect(initiated.status).toBe("initiated");
		expect(initiated.facts.leaveBalanceDays).toBe("2");

		const calculated = unwrap(
			await calculateFinalSettlement(
				{
					...context(CALCULATOR_ID),
					expectedVersion: initiated.version,
					settlementId: initiated.id,
				},
				seeded.options,
			),
		);
		expect(calculated.settlement.status).toBe("calculated");
		expect(calculated.settlement.totals).toEqual({
			employeeStatutory: "100",
			employerStatutory: "50",
			gross: "2200",
			net: "2050",
			recoveries: "50",
		});
		expect(calculated.lines.map((line) => line.kind)).toEqual([
			"prorated_base",
			"leave_encashment",
			"notice_pay",
			"notice_in_lieu",
			"recovery",
			"employee_statutory",
			"employer_statutory",
		]);
		expect(calculated.lines[0]?.amount).toBe("1500");
		expect(calculated.lines[1]?.amount).toBe("200");

		const sameActor = await finalizeFinalSettlement(
			{
				...context(CALCULATOR_ID),
				expectedVersion: calculated.settlement.version,
				settlementId: initiated.id,
			},
			seeded.options,
		);
		expect(sameActor.ok).toBe(false);
		if (!sameActor.ok) {
			expect(sameActor.message).toContain("Segregation of duties");
		}

		const finalized = unwrap(
			await finalizeFinalSettlement(
				{
					...context(FINALIZER_ID),
					expectedVersion: calculated.settlement.version,
					settlementId: initiated.id,
				},
				seeded.options,
			),
		);
		expect(finalized.status).toBe("finalized");

		const stated = unwrap(
			await issueFinalSettlementStatement(
				{
					...context(REVIEWER_ID),
					expectedVersion: finalized.version,
					settlementId: initiated.id,
				},
				seeded.options,
			),
		);
		expect(stated.settlement.status).toBe("stated");
		expect(stated.settlement.statement?.totals.net).toBe("2050");
		expect(stated.settlement.statement?.terminationId).toBe("term-final-001");
	});

	it("returns the same settlement for matching initiate idempotency", async () => {
		const seeded = await seedOpenPeriod();
		const first = unwrap(
			await initiateFinalSettlement(initiateInput(seeded), seeded.options),
		);
		const second = unwrap(
			await initiateFinalSettlement(initiateInput(seeded), seeded.options),
		);
		expect(second.id).toBe(first.id);
	});

	it("creates a C6 clearance case when the origin run is already calculated", async () => {
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

		const initiated = unwrap(
			await initiateFinalSettlement(
				{
					...initiateInput(seeded),
					originRunId: run.id as PayrollRunId,
				},
				seeded.options,
			),
		);
		expect(initiated.status).toBe("clearance_required");
		expect(initiated.clearanceRequiredReason).toContain(
			"origin run was locked",
		);

		const blocked = await calculateFinalSettlement(
			{
				...context(CALCULATOR_ID),
				expectedVersion: initiated.version,
				settlementId: initiated.id,
			},
			seeded.options,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.message).toContain("Human clearance is required");
		}

		const calculated = unwrap(
			await calculateFinalSettlement(
				{
					...context(CALCULATOR_ID),
					clearanceReason: "Payroll ops cleared mid-period termination",
					expectedVersion: initiated.version,
					settlementId: initiated.id,
				},
				seeded.options,
			),
		);
		expect(calculated.settlement.status).toBe("calculated");
		expect(calculated.settlement.clearanceReason).toContain("cleared");
		const origin = unwrap(
			await seeded.store.getRun({
				organizationId: ORGANIZATION_ID,
				runId: run.id,
			}),
		);
		expect(origin?.status).toBe("calculating");
		expect(origin?.version).toBe(calculating.version);
	});

	it("creates a C6 clearance case when the period is already closed", async () => {
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

		const initiated = unwrap(
			await initiateFinalSettlement(initiateInput(seeded), seeded.options),
		);
		expect(initiated.status).toBe("clearance_required");
		expect(initiated.clearanceRequiredReason).toContain("period was closed");
	});
});
