import { describe, expect, it } from "vitest";

import {
	calculateEmployeePayroll,
	hashSnapshot,
	normalizeCalcOutput,
	type PayrollEmployeeCalcSnapshot,
} from "../src/features/calculation/calculation";
import type {
	PayrollResultLineCreateRecord,
	PayrollRunEmployeeCreateRecord,
} from "../src/features/calculation/outputs.store";
import { finalizePayrollRun } from "../src/features/payroll-runs/finalization";
import { createPayrollPeriod } from "../src/features/payroll-runs/payroll-period";
import { createPayrollRun } from "../src/features/payroll-runs/payroll-run";
import { createPayrollCalendar } from "../src/features/payroll-setup/calendar";
import { createPayrollEarningRule } from "../src/features/payroll-setup/earning-rule";
import { createPayrollPayGroup } from "../src/features/payroll-setup/pay-group";
import {
	applyRetroToPeriod,
	calculateRetroDifference,
	listRetroItems,
	queueRetroItem,
} from "../src/features/retro-pay/retro.command";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	PAYROLL_PERMISSION_INPUT_MANAGE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_SETUP_MANAGE,
} from "../src/kernel/execution/permissions";
import {
	type PayrollPeriodId,
	type PayrollRunId,
	parsePayrollResultLineId,
	parsePayrollRunEmployeeId,
} from "../src/kernel/identity/brands";
import {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	PAYROLL_CALCULATION_VERSION,
} from "../src/kernel/money/rounding-policy";
import { payrollJsonObjectSchema } from "../src/kernel/validation/common.schema";
import { createMemoryPayrollStore } from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORGANIZATION_ID = "org-payroll-retro";
const ACTOR_ID = "actor-payroll-retro";
const FINALIZER_ID = "actor-payroll-retro-finalizer";
const EMPLOYEE_ID = "emp-payroll-retro-001";
const CORRELATION_ID = "corr-payroll-retro";
const ASSIGNMENT_ID = "b0000001-0001-4001-8001-000000000001";
const RUN_EMPLOYEE_ID = "b0000003-0003-4003-8003-000000000003";

const RETRO_PERMISSIONS = [
	PAYROLL_PERMISSION_SETUP_MANAGE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_INPUT_MANAGE,
];

function authorization(
	permissions: readonly string[],
): PayrollAuthorizationPort {
	return { can: async ({ permission }) => permissions.includes(permission) };
}

function context() {
	return {
		organizationId: ORGANIZATION_ID,
		actorUserId: ACTOR_ID,
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
 * The sealed snapshot pins a rate rule at 0.10. Every retro recompute must
 * reproduce that rate even after the live rule moves.
 */
function sealedSnapshot(input: {
	bonusRuleId: string;
	bonusRuleRecordVersion: number;
	payGroupId: string;
	periodId: string;
}): PayrollEmployeeCalcSnapshot {
	return {
		approvedWorkFacts: {
			approvalEvidence: {
				approvedAt: "2025-01-31T00:00:00.000Z",
				correlationId: CORRELATION_ID,
			},
			components: [],
			leaveFacts: [],
			overtimeFacts: [],
			sourceVersion: { compensationVersion: 1 },
			timeFacts: null,
		},
		assignmentId: ASSIGNMENT_ID,
		calculationVersion: PAYROLL_CALCULATION_VERSION,
		currencyCode: "USD",
		deductionRules: [],
		earningRules: [
			{
				amount: null,
				code: "BONUS",
				currencyCode: "USD",
				id: input.bonusRuleId,
				name: "Sealed bonus",
				rate: "0.10",
				recordVersion: input.bonusRuleRecordVersion,
				ruleType: "rate",
				ruleVersion: "1",
			},
		],
		eligibility: { eligible: true, reason: null },
		employee: {
			baseCompensation: "5000",
			currencyCode: "USD",
			employeeId: EMPLOYEE_ID,
			employmentStatus: "active",
			recurringAllowances: [{ amount: "200", code: "MEAL" }],
			recurringDeductions: [],
		},
		employeeId: EMPLOYEE_ID,
		organizationId: ORGANIZATION_ID,
		payGroupId: input.payGroupId,
		periodId: input.periodId,
		recurringDeductions: [],
		recurringEarnings: [
			{
				amount: "0",
				currencyCode: "USD",
				earningRuleCode: "BONUS",
				earningRuleId: input.bonusRuleId,
				earningRuleVersion: "1",
				id: "b0000004-0004-4004-8004-000000000004",
			},
		],
		roundingPolicy: DEFAULT_PAYROLL_ROUNDING_POLICY,
		statutoryRules: [],
		variableInputs: [],
	};
}

async function seedSealedPeriod() {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const options = {
		store,
		ports,
		authorization: authorization(RETRO_PERMISSIONS),
	};

	const calendar = unwrap(
		await createPayrollCalendar(
			{
				...context(),
				code: "CAL-RETRO",
				name: "Retro calendar",
				timezone: "UTC",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-cal-retro",
			},
			options,
		),
	);
	const payGroup = unwrap(
		await createPayrollPayGroup(
			{
				...context(),
				calendarId: calendar.id,
				code: "PG-RETRO",
				name: "Retro pay group",
				currencyCode: "USD",
				idempotencyKey: "idem-pg-retro",
			},
			options,
		),
	);
	const originPeriod = unwrap(
		await createPayrollPeriod(
			{
				...context(),
				payGroupId: payGroup.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
				cutoffDate: "2025-01-28",
				idempotencyKey: "idem-period-retro-origin",
			},
			options,
		),
	);
	const targetPeriod = unwrap(
		await createPayrollPeriod(
			{
				...context(),
				payGroupId: payGroup.id,
				periodStart: "2025-02-01",
				periodEnd: "2025-02-28",
				cutoffDate: "2025-02-25",
				idempotencyKey: "idem-period-retro-target",
			},
			options,
		),
	);
	const originRun = unwrap(
		await createPayrollRun(
			{
				...context(),
				payGroupId: payGroup.id,
				periodId: originPeriod.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-retro-origin",
			},
			options,
		),
	);
	const targetRun = unwrap(
		await createPayrollRun(
			{
				...context(),
				payGroupId: payGroup.id,
				periodId: targetPeriod.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-retro-target",
			},
			options,
		),
	);

	// The rule the sealed period actually priced under.
	const sealedBonusRule = unwrap(
		await createPayrollEarningRule(
			{
				...context(),
				payGroupId: payGroup.id,
				code: "BONUS",
				name: "Sealed bonus",
				ruleType: "rate",
				amount: null,
				rate: "0.10",
				currencyCode: "USD",
				ruleVersion: "1",
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-01-31",
				idempotencyKey: "idem-rule-retro-bonus-v1",
			},
			options,
		),
	);

	const snapshot = sealedSnapshot({
		bonusRuleId: sealedBonusRule.id,
		bonusRuleRecordVersion: sealedBonusRule.version,
		payGroupId: payGroup.id,
		periodId: originPeriod.id,
	});
	const snapshotJson = payrollJsonObjectSchema.parse(snapshot);
	const snapshotHash = hashSnapshot(snapshotJson);
	const sealedOutput = normalizeCalcOutput(calculateEmployeePayroll(snapshot));

	const runEmployeeId = unwrap(parsePayrollRunEmployeeId(RUN_EMPLOYEE_ID));
	const runEmployee: PayrollRunEmployeeCreateRecord = {
		assignmentId: null,
		calculationVersion: PAYROLL_CALCULATION_VERSION,
		currencyCode: "USD",
		employeeDeductions: sealedOutput.totals.employeeDeductions,
		employeeId: EMPLOYEE_ID,
		employeeStatutory: sealedOutput.totals.employeeStatutory,
		employerCost: sealedOutput.totals.employerCost,
		gross: sealedOutput.totals.gross,
		id: runEmployeeId,
		net: sealedOutput.totals.net,
		snapshotHash,
		snapshotJson,
		status: "calculated",
	};
	const resultLines: PayrollResultLineCreateRecord[] = sealedOutput.lines.map(
		(line, index): PayrollResultLineCreateRecord => ({
			amount: line.amount,
			code: line.code,
			currencyCode: line.currencyCode,
			employeeId: EMPLOYEE_ID,
			id: unwrap(
				parsePayrollResultLineId(
					`b0000005-0005-4005-8005-00000000000${index + 1}`,
				),
			),
			lineKind: line.lineKind,
			ruleCode: line.ruleCode,
			ruleKind: line.ruleKind,
			ruleVersion: line.ruleVersion,
			runEmployeeId,
			sequence: line.sequence,
			sourceId: line.sourceId,
			sourceType: line.sourceType,
			traceRef: line.traceRef,
		}),
	);

	unwrap(
		await store.replaceRunCalculationOutputs(
			{
				actorUserId: ACTOR_ID,
				correlationId: CORRELATION_ID,
				organizationId: ORGANIZATION_ID,
				resultLines,
				runEmployees: [runEmployee],
				runId: originRun.id,
			},
			ports,
		),
	);

	const calculating = unwrap(
		await store.updateRunWithVersion(
			{
				actorUserId: ACTOR_ID,
				correlationId: CORRELATION_ID,
				expectedVersion: originRun.version,
				organizationId: ORGANIZATION_ID,
				runId: originRun.id,
				status: "calculating",
			},
			ports,
		),
	);
	const calculated = unwrap(
		await store.updateRunWithVersion(
			{
				actorUserId: ACTOR_ID,
				calculationSnapshotHash: hashSnapshot({
					calculationVersion: PAYROLL_CALCULATION_VERSION,
					roundingPolicy: DEFAULT_PAYROLL_ROUNDING_POLICY,
					runId: originRun.id,
					snapshotHashes: [snapshotHash],
				}),
				calculationVersion: PAYROLL_CALCULATION_VERSION,
				correlationId: CORRELATION_ID,
				expectedVersion: calculating.version,
				organizationId: ORGANIZATION_ID,
				roundingPolicyJson: { ...DEFAULT_PAYROLL_ROUNDING_POLICY },
				runId: originRun.id,
				status: "calculated",
			},
			ports,
		),
	);
	const finalized = unwrap(
		await finalizePayrollRun(
			{
				...context(),
				// C9 segregation of duties — the calculating actor may not finalize.
				actorUserId: FINALIZER_ID,
				expectedVersion: calculated.version,
				runId: originRun.id,
			},
			options,
		),
	);

	// The live rule moves after sealing — history must not follow it.
	unwrap(
		await createPayrollEarningRule(
			{
				...context(),
				payGroupId: payGroup.id,
				code: "BONUS",
				name: "Repriced bonus",
				ruleType: "rate",
				amount: null,
				rate: "0.50",
				currencyCode: "USD",
				ruleVersion: "2",
				effectiveFrom: "2025-02-01",
				idempotencyKey: "idem-rule-retro-bonus-v2",
			},
			options,
		),
	);

	return {
		bonusRuleId: sealedBonusRule.id,
		options,
		originPeriodId: originPeriod.id,
		originRun: finalized,
		payGroupId: payGroup.id,
		sealedOutput,
		store,
		targetPeriodId: targetPeriod.id,
		targetRunId: targetRun.id,
	};
}

function queueBaseCorrection(
	options: Awaited<ReturnType<typeof seedSealedPeriod>>["options"],
	originPeriodId: PayrollPeriodId,
	idempotencyKey = "idem-retro-1",
) {
	return queueRetroItem(
		{
			...context(),
			correction: { amount: "6000", kind: "base_compensation" },
			employeeId: EMPLOYEE_ID,
			idempotencyKey,
			originPeriodId,
			reason: "Backdated increase approved after inputs_locked",
		},
		options,
	);
}

describe("retro-pay", () => {
	it("seals a period whose gross reflects the 0.10 snapshot rate", async () => {
		const seeded = await seedSealedPeriod();
		// 5000 base + 200 allowance = 5200; BONUS 0.10 * 5200 = 520.
		expect(seeded.sealedOutput.totals.gross).toBe("5720");
	});

	it("queues a deferred correction and replays the same idempotency key", async () => {
		const seeded = await seedSealedPeriod();
		const queued = unwrap(
			await queueBaseCorrection(seeded.options, seeded.originPeriodId),
		);
		expect(queued.status).toBe("queued");
		expect(queued.difference).toBeNull();
		expect(queued.originRunId).toBeNull();

		const replayed = unwrap(
			await queueBaseCorrection(seeded.options, seeded.originPeriodId),
		);
		expect(replayed.id).toBe(queued.id);

		const conflicting = await queueRetroItem(
			{
				...context(),
				correction: { amount: "7000", kind: "base_compensation" },
				employeeId: EMPLOYEE_ID,
				idempotencyKey: "idem-retro-1",
				originPeriodId: seeded.originPeriodId,
				reason: "Backdated increase approved after inputs_locked",
			},
			seeded.options,
		);
		expect(conflicting.ok).toBe(false);
		if (conflicting.ok) {
			return;
		}
		expect(conflicting.code).toBe("CONFLICT");
	});

	it("rejects a retro item queued against an unknown origin period", async () => {
		const seeded = await seedSealedPeriod();
		const queued = await queueRetroItem(
			{
				...context(),
				correction: { amount: "6000", kind: "base_compensation" },
				employeeId: EMPLOYEE_ID,
				idempotencyKey: "idem-retro-unknown-period",
				originPeriodId: "b0000009-0009-4009-8009-000000000009",
				reason: "Unknown period",
			},
			seeded.options,
		);
		expect(queued.ok).toBe(false);
		if (queued.ok) {
			return;
		}
		expect(queued.code).toBe("NOT_FOUND");
	});

	it("recomputes the sealed period under its pinned rule version, not today's rate", async () => {
		const seeded = await seedSealedPeriod();
		const queued = unwrap(
			await queueBaseCorrection(seeded.options, seeded.originPeriodId),
		);

		const calculated = unwrap(
			await calculateRetroDifference(
				{
					...context(),
					originRunId: seeded.originRun.id,
					retroItemId: queued.id,
				},
				seeded.options,
			),
		);
		expect(calculated.status).toBe("calculated");
		expect(calculated.originRunId).toBe(seeded.originRun.id);

		const { difference } = calculated;
		expect(difference).not.toBeNull();
		if (difference === null) {
			return;
		}
		expect(difference.calculationVersion).toBe(PAYROLL_CALCULATION_VERSION);

		// Corrected: 6000 + 200 = 6200; BONUS still 0.10 => 620.
		// Under today's 0.50 rule the bonus delta would have been 500.
		expect(difference.totals.gross).toBe("1100");
		expect(difference.totals.net).toBe("1100");
		const bonus = difference.lines.find((line) => line.code === "BONUS");
		expect(bonus).toBeDefined();
		expect(bonus?.amount).toBe("100");
		expect(bonus?.ruleVersion).toBe("1");
		const base = difference.lines.find(
			(line) => line.code === "BASE_COMPENSATION",
		);
		expect(base?.amount).toBe("1000");
	});

	it("refuses to recompute against a run that is not finalized", async () => {
		const seeded = await seedSealedPeriod();
		const queued = unwrap(
			await queueBaseCorrection(seeded.options, seeded.originPeriodId),
		);

		const calculated = await calculateRetroDifference(
			{
				...context(),
				originRunId: seeded.targetRunId,
				retroItemId: queued.id,
			},
			seeded.options,
		);
		expect(calculated.ok).toBe(false);
		if (calculated.ok) {
			return;
		}
		expect(calculated.code).toBe("CONFLICT");
	});

	it("applies the difference into the open target period with origin labels", async () => {
		const seeded = await seedSealedPeriod();
		const queued = unwrap(
			await queueBaseCorrection(seeded.options, seeded.originPeriodId),
		);
		unwrap(
			await calculateRetroDifference(
				{
					...context(),
					originRunId: seeded.originRun.id,
					retroItemId: queued.id,
				},
				seeded.options,
			),
		);

		const applied = unwrap(
			await applyRetroToPeriod(
				{
					...context(),
					retroItemId: queued.id,
					targetPeriodId: seeded.targetPeriodId,
					targetRunId: seeded.targetRunId,
				},
				seeded.options,
			),
		);
		expect(applied.item.status).toBe("applied");
		expect(applied.item.targetRunId).toBe(seeded.targetRunId);
		expect(applied.lines).toHaveLength(2);
		for (const line of applied.lines) {
			expect(line.originPeriodId).toBe(seeded.originPeriodId);
			expect(line.originRunId).toBe(seeded.originRun.id);
			expect(line.targetRunId).toBe(seeded.targetRunId);
			expect(line.employeeId).toBe(EMPLOYEE_ID);
		}

		const reapplied = await applyRetroToPeriod(
			{
				...context(),
				retroItemId: queued.id,
				targetPeriodId: seeded.targetPeriodId,
				targetRunId: seeded.targetRunId,
			},
			seeded.options,
		);
		expect(reapplied.ok).toBe(false);
		if (reapplied.ok) {
			return;
		}
		expect(reapplied.code).toBe("CONFLICT");
	});

	it("refuses to apply into a period that is not open", async () => {
		const seeded = await seedSealedPeriod();
		const queued = unwrap(
			await queueBaseCorrection(seeded.options, seeded.originPeriodId),
		);
		unwrap(
			await calculateRetroDifference(
				{
					...context(),
					originRunId: seeded.originRun.id,
					retroItemId: queued.id,
				},
				seeded.options,
			),
		);

		const closed = unwrap(
			await seeded.store.closePeriod(
				{
					actorUserId: ACTOR_ID,
					correlationId: CORRELATION_ID,
					expectedVersion: 1,
					organizationId: ORGANIZATION_ID,
					periodId: seeded.targetPeriodId,
				},
				seeded.options.ports,
			),
		);
		expect(closed.status).toBe("closed");

		const applied = await applyRetroToPeriod(
			{
				...context(),
				retroItemId: queued.id,
				targetPeriodId: seeded.targetPeriodId,
				targetRunId: seeded.targetRunId,
			},
			seeded.options,
		);
		expect(applied.ok).toBe(false);
		if (applied.ok) {
			return;
		}
		expect(applied.code).toBe("CONFLICT");
	});

	it("refuses to apply a retro item that has no calculated difference", async () => {
		const seeded = await seedSealedPeriod();
		const queued = unwrap(
			await queueBaseCorrection(seeded.options, seeded.originPeriodId),
		);

		const applied = await applyRetroToPeriod(
			{
				...context(),
				retroItemId: queued.id,
				targetPeriodId: seeded.targetPeriodId,
				targetRunId: seeded.targetRunId,
			},
			seeded.options,
		);
		expect(applied.ok).toBe(false);
		if (applied.ok) {
			return;
		}
		expect(applied.code).toBe("CONFLICT");
	});

	it("lists retro items for exception review with their emitted lines", async () => {
		const seeded = await seedSealedPeriod();
		const queued = unwrap(
			await queueBaseCorrection(seeded.options, seeded.originPeriodId),
		);

		const beforeCalculation = unwrap(
			await listRetroItems(
				{
					organizationId: ORGANIZATION_ID,
					actorUserId: ACTOR_ID,
					status: "queued",
				},
				seeded.options,
			),
		);
		expect(beforeCalculation).toHaveLength(1);
		expect(beforeCalculation[0]?.lines).toEqual([]);

		unwrap(
			await calculateRetroDifference(
				{
					...context(),
					originRunId: seeded.originRun.id,
					retroItemId: queued.id,
				},
				seeded.options,
			),
		);
		unwrap(
			await applyRetroToPeriod(
				{
					...context(),
					retroItemId: queued.id,
					targetPeriodId: seeded.targetPeriodId,
					targetRunId: seeded.targetRunId,
				},
				seeded.options,
			),
		);

		const applied = unwrap(
			await listRetroItems(
				{
					organizationId: ORGANIZATION_ID,
					actorUserId: ACTOR_ID,
					targetRunId: seeded.targetRunId,
				},
				seeded.options,
			),
		);
		expect(applied).toHaveLength(1);
		expect(applied[0]?.item.status).toBe("applied");
		expect(applied[0]?.lines.map((line) => line.code).toSorted()).toEqual([
			"BASE_COMPENSATION",
			"BONUS",
		]);

		const otherPeriod = unwrap(
			await listRetroItems(
				{
					organizationId: ORGANIZATION_ID,
					actorUserId: ACTOR_ID,
					originPeriodId: seeded.targetPeriodId,
				},
				seeded.options,
			),
		);
		expect(otherPeriod).toEqual([]);
	});

	it("refuses every retro operation without its permission", async () => {
		const seeded = await seedSealedPeriod();
		const deniedOptions = {
			...seeded.options,
			authorization: authorization([]),
		};
		const queued = await queueBaseCorrection(
			deniedOptions,
			seeded.originPeriodId,
			"idem-retro-denied",
		);
		expect(queued.ok).toBe(false);
		if (queued.ok) {
			return;
		}
		expect(queued.code).toBe("FORBIDDEN");
	});

	it("rejects tenant-field injection through the retro item payload", async () => {
		const seeded = await seedSealedPeriod();
		const queued = await queueRetroItem(
			{
				...context(),
				correction: { amount: "6000", kind: "base_compensation" },
				createdBy: "attacker",
				employeeId: EMPLOYEE_ID,
				idempotencyKey: "idem-retro-injection",
				originPeriodId: seeded.originPeriodId,
				reason: "Injection attempt",
			},
			seeded.options,
		);
		expect(queued.ok).toBe(false);
		if (queued.ok) {
			return;
		}
		expect(queued.code).toBe("VALIDATION_ERROR");
	});

	it("refuses a variable-input correction that references a rule absent from the snapshot", async () => {
		const seeded = await seedSealedPeriod();
		const queued = unwrap(
			await queueRetroItem(
				{
					...context(),
					correction: {
						amount: "300",
						currencyCode: "USD",
						earningRuleCode: "UNKNOWN",
						earningRuleId: "b000000a-000a-400a-800a-00000000000a",
						earningRuleVersion: "1",
						kind: "variable_input",
						sourceId: "late-input-1",
						sourceType: "hr_late_input",
					},
					employeeId: EMPLOYEE_ID,
					idempotencyKey: "idem-retro-unknown-rule",
					originPeriodId: seeded.originPeriodId,
					reason: "Late variable input referencing an unpinned rule",
				},
				seeded.options,
			),
		);

		const calculated = await calculateRetroDifference(
			{
				...context(),
				originRunId: seeded.originRun.id,
				retroItemId: queued.id,
			},
			seeded.options,
		);
		expect(calculated.ok).toBe(false);
		if (calculated.ok) {
			return;
		}
		expect(calculated.code).toBe("VALIDATION_ERROR");
	});

	it("prices a late variable input under the snapshot's pinned rule", async () => {
		const seeded = await seedSealedPeriod();
		const queued = unwrap(
			await queueRetroItem(
				{
					...context(),
					correction: {
						amount: "1000",
						currencyCode: "USD",
						earningRuleCode: "BONUS",
						earningRuleId: seeded.bonusRuleId,
						earningRuleVersion: "1",
						kind: "variable_input",
						sourceId: "late-input-2",
						sourceType: "hr_late_input",
					},
					employeeId: EMPLOYEE_ID,
					idempotencyKey: "idem-retro-late-variable",
					originPeriodId: seeded.originPeriodId,
					reason: "Late variable input arriving after inputs_locked",
				},
				seeded.options,
			),
		);

		const calculated = unwrap(
			await calculateRetroDifference(
				{
					...context(),
					originRunId: seeded.originRun.id,
					retroItemId: queued.id,
				},
				seeded.options,
			),
		);
		const { difference } = calculated;
		expect(difference).not.toBeNull();
		if (difference === null) {
			return;
		}
		// Rate rule at the sealed 0.10 over the running gross of 5720, not 0.50.
		expect(difference.totals.gross).toBe("572");
		expect(difference.lines).toHaveLength(1);
		expect(difference.lines[0]?.ruleVersion).toBe("1");
	});
});

describe("retro-pay isolation", () => {
	it("never returns another organization's retro item", async () => {
		const seeded = await seedSealedPeriod();
		const queued = unwrap(
			await queueBaseCorrection(seeded.options, seeded.originPeriodId),
		);

		const foreign = await calculateRetroDifference(
			{
				actorUserId: ACTOR_ID,
				correlationId: CORRELATION_ID,
				organizationId: "org-payroll-retro-other",
				originRunId: seeded.originRun.id as PayrollRunId,
				retroItemId: queued.id,
			},
			seeded.options,
		);
		expect(foreign.ok).toBe(false);
		if (foreign.ok) {
			return;
		}
		expect(foreign.code).toBe("NOT_FOUND");
	});
});
