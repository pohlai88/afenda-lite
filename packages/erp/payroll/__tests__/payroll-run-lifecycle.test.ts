import {
	PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_RUN_STARTED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";
import { hashSnapshot } from "../src/features/calculation/calculation";
import {
	buildPayrollFinalizationProjection,
	buildPayrollReversalProjection,
} from "../src/features/calculation/finalization-evidence";
import {
	payrollResultLineRecordSchema,
	payrollRunEmployeeRecordSchema,
} from "../src/features/calculation/outputs.schema";
import {
	listPayrollExceptionsForRun,
	recordPayrollException,
} from "../src/features/payroll-runs/exception";
import { finalizePayrollRun } from "../src/features/payroll-runs/finalization";
import { buildPayrollRunEventPayloadForType } from "../src/features/payroll-runs/lifecycle-events";
import { createPayrollPeriod } from "../src/features/payroll-runs/payroll-period";
import {
	createPayrollRun,
	getPayrollRun,
} from "../src/features/payroll-runs/payroll-run";
import { reversePayrollRun } from "../src/features/payroll-runs/reversal";
import { calculatePayrollRun } from "../src/features/payroll-runs/run-calculate-command";
import { payrollRunRecordSchema } from "../src/features/payroll-runs/runs.schema";
import { createPayrollCalendar } from "../src/features/payroll-setup/calendar";
import { createPayrollPayGroup } from "../src/features/payroll-setup/pay-group";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVERSE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_SETUP_MANAGE,
} from "../src/kernel/execution/permissions";
import {
	createMemoryPayrollStore,
	createTestPayrollRunCalculator,
} from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

function createGrantingAuthorization(
	permissions: string[],
): PayrollAuthorizationPort {
	return {
		can: async ({ permission }) => permissions.includes(permission),
	};
}

function baseContext(organizationId: string, actorUserId: string) {
	return {
		organizationId,
		actorUserId,
		correlationId: "corr-run-lifecycle",
	};
}

const RUN_PERMISSIONS = [
	PAYROLL_PERMISSION_SETUP_MANAGE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVERSE,
	PAYROLL_PERMISSION_RUN_REVIEW,
];

async function seedOpenPeriod(
	organizationId: string,
	actorUserId: string,
	suffix: string,
) {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingAuthorization(RUN_PERMISSIONS);
	const options = { store, ports, authorization };

	const calendar = await createPayrollCalendar(
		{
			...baseContext(organizationId, actorUserId),
			code: `CAL-${suffix}`,
			name: "Lifecycle calendar",
			timezone: "UTC",
			effectiveFrom: "2025-01-01",
			idempotencyKey: `idem-cal-${suffix}`,
		},
		options,
	);
	if (!calendar.ok) {
		throw new Error(calendar.message);
	}

	const payGroup = await createPayrollPayGroup(
		{
			...baseContext(organizationId, actorUserId),
			calendarId: calendar.data.id,
			code: `PG-${suffix}`,
			name: "Lifecycle pay group",
			currencyCode: "USD",
			idempotencyKey: `idem-pg-${suffix}`,
		},
		options,
	);
	if (!payGroup.ok) {
		throw new Error(payGroup.message);
	}

	const period = await createPayrollPeriod(
		{
			...baseContext(organizationId, actorUserId),
			payGroupId: payGroup.data.id,
			periodStart: "2025-01-01",
			periodEnd: "2025-01-31",
			cutoffDate: "2025-01-28",
			idempotencyKey: `idem-period-${suffix}`,
		},
		options,
	);
	if (!period.ok) {
		throw new Error(period.message);
	}

	return {
		store,
		ports,
		authorization,
		options,
		payGroup: payGroup.data,
		period: period.data,
	};
}

describe("payroll run lifecycle commands", () => {
	it("derives exact opposite payment and posting correction contracts", () => {
		const now = new Date("2025-01-31T00:00:00.000Z");
		const snapshotHash = hashSnapshot({ employee: "synthetic-1" });
		const run = payrollRunRecordSchema.parse({
			id: "00000000-0000-4000-8000-000000000951",
			organizationId: "org-opposite-contract",
			payGroupId: "00000000-0000-4000-8000-000000000952",
			periodId: "00000000-0000-4000-8000-000000000953",
			runType: "regular",
			sequence: 1,
			status: "finalized",
			finalizedAt: now.toISOString(),
			finalizedBy: "actor-opposite-contract",
			calculationSnapshotHash: hashSnapshot({
				runId: "00000000-0000-4000-8000-000000000951",
				calculationVersion: "payroll.calc.v1",
				roundingPolicy: { mode: "half_even", scale: 2 },
				snapshotHashes: [snapshotHash],
			}),
			calculationVersion: "payroll.calc.v1",
			roundingPolicyJson: { mode: "half_even", scale: 2 },
			version: 3,
			createdBy: "actor-opposite-contract",
			updatedBy: "actor-opposite-contract",
			createdAt: now,
			updatedAt: now,
		});
		const employee = payrollRunEmployeeRecordSchema.parse({
			id: "00000000-0000-4000-8000-000000000954",
			organizationId: run.organizationId,
			runId: run.id,
			employeeId: "synthetic-employee-1",
			assignmentId: null,
			currencyCode: "USD",
			gross: "1000",
			employeeDeductions: "0",
			employeeStatutory: "0",
			employerCost: "0",
			net: "1000",
			snapshotJson: { employee: "synthetic-1" },
			snapshotHash,
			calculationVersion: "payroll.calc.v1",
			status: "calculated",
			createdAt: now,
			updatedAt: now,
		});
		const line = payrollResultLineRecordSchema.parse({
			id: "00000000-0000-4000-8000-000000000955",
			organizationId: run.organizationId,
			runId: run.id,
			runEmployeeId: employee.id,
			employeeId: employee.employeeId,
			lineKind: "earning",
			code: "BASE",
			ruleCode: "BASE",
			ruleVersion: "1",
			ruleKind: "earning",
			amount: "1000",
			currencyCode: "USD",
			sourceType: null,
			sourceId: null,
			sequence: 1,
			traceRef: "trace-opposite-contract",
			createdAt: now,
			updatedAt: now,
		});
		const original = buildPayrollFinalizationProjection({
			run,
			periodEnd: "2025-01-31",
			runEmployees: [employee],
			resultLines: [line],
		});
		const correction = buildPayrollReversalProjection({
			run,
			periodEnd: "2025-01-31",
			reason: "Synthetic exact-opposite contract",
			reasonCode: "calculation_correction",
			runEmployees: [employee],
			resultLines: [line],
		});
		expect(original.ok).toBe(true);
		expect(correction.ok).toBe(true);
		if (!(original.ok && correction.ok)) {
			return;
		}
		expect(correction.data.payments[0]?.amount).toBe(
			`-${original.data.payments[0]?.amount}`,
		);
		expect(correction.data.postingLines[0]?.amount).toBe(
			`-${original.data.postingLines[0]?.amount}`,
		);
		const paymentEvent = buildPayrollRunEventPayloadForType({
			eventType: PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
			actorUserId: "actor-opposite-contract",
			correlationId: "corr-opposite-contract",
			run: { ...run, status: "reversed" },
			reversalProjection: correction.data,
		});
		const postingEvent = buildPayrollRunEventPayloadForType({
			eventType: PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
			actorUserId: "actor-opposite-contract",
			correlationId: "corr-opposite-contract",
			run: { ...run, status: "reversed" },
			reversalProjection: correction.data,
		});
		expect(paymentEvent).toMatchObject({
			reasonCode: "calculation_correction",
			payments: [{ amount: "-1000" }],
		});
		expect(postingEvent).toMatchObject({
			reasonCode: "calculation_correction",
			lines: [{ amount: "-1000" }],
		});
		expect(paymentEvent).not.toHaveProperty("reason");
		expect(postingEvent).not.toHaveProperty("reason");
	});

	it("runs create → calculate → finalize → reverse", async () => {
		const organizationId = "org-run-lifecycle-happy";
		const actorUserId = "user-run-lifecycle-happy";
		const finalizeActorUserId = "user-run-lifecycle-happy-finalize";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "happy");
		const calculator = createTestPayrollRunCalculator();
		const options = { ...seeded.options, calculator };

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-happy",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.status).toBe("draft");

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}
		expect(calculated.data.status).toBe("calculated");
		expect(calculated.data.calculationSnapshotHash).toHaveLength(64);

		const finalized = await finalizePayrollRun(
			{
				...baseContext(organizationId, finalizeActorUserId),
				runId: calculated.data.id,
				expectedVersion: calculated.data.version,
			},
			options,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) {
			return;
		}
		expect(finalized.data.status).toBe("finalized");
		expect(finalized.data.finalizedBy).toBe(finalizeActorUserId);

		const lateException = await recordPayrollException(
			{
				...baseContext(organizationId, actorUserId),
				runId: finalized.data.id,
				severity: "blocking",
				exceptionCode: "LATE_BLOCKER",
				message: "Must not be accepted after finalization",
				employeeRef: null,
			},
			options,
		);
		expect(lateException.ok).toBe(false);
		if (!lateException.ok) {
			expect(lateException.code).toBe("CONFLICT");
		}

		const reversed = await reversePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: finalized.data.id,
				expectedVersion: finalized.data.version,
				idempotencyKey: "reverse-lifecycle-success",
				reasonCode: "operational_correction",
				reason: "Synthetic reversal for lifecycle test",
			},
			options,
		);
		expect(reversed.ok).toBe(true);
		if (!reversed.ok) {
			return;
		}
		expect(reversed.data.status).toBe("reversed");
		const reversalReplay = await reversePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: finalized.data.id,
				expectedVersion: finalized.data.version,
				idempotencyKey: "reverse-lifecycle-success",
				reasonCode: "operational_correction",
				reason: "Synthetic reversal for lifecycle test",
			},
			options,
		);
		expect(reversalReplay.ok).toBe(true);
		if (reversalReplay.ok) {
			expect(reversalReplay.data.id).toBe(reversed.data.id);
			expect(reversalReplay.data.version).toBe(reversed.data.version);
		}
		const conflictingReplay = await reversePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: finalized.data.id,
				expectedVersion: finalized.data.version,
				idempotencyKey: "reverse-lifecycle-success",
				reasonCode: "accounting_correction",
				reason: "Different request must conflict",
			},
			options,
		);
		expect(conflictingReplay.ok).toBe(false);
		if (!conflictingReplay.ok) {
			expect(conflictingReplay.code).toBe("CONFLICT");
		}
		expect(seeded.ports.outbox.calls.map(({ type }) => type)).toEqual([
			PAYROLL_RUN_STARTED_EVENT,
			PAYROLL_RUN_CALCULATED_EVENT,
			PAYROLL_RUN_FINALIZED_EVENT,
			PAYROLL_PAYMENT_REQUESTED_EVENT,
			PAYROLL_POSTING_REQUESTED_EVENT,
			PAYROLL_RUN_REVERSED_EVENT,
			PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
			PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
		]);
		const paymentRequest = seeded.ports.outbox.calls.find(
			({ type }) => type === PAYROLL_PAYMENT_REQUESTED_EVENT,
		);
		const postingRequest = seeded.ports.outbox.calls.find(
			({ type }) => type === PAYROLL_POSTING_REQUESTED_EVENT,
		);
		const paymentCorrection = seeded.ports.outbox.calls.find(
			({ type }) => type === PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
		);
		const postingCorrection = seeded.ports.outbox.calls.find(
			({ type }) => type === PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
		);
		expect(paymentRequest?.payload).toMatchObject({
			payGroupId: seeded.payGroup.id,
			periodId: seeded.period.id,
			paymentDate: seeded.period.periodEnd,
			payments: [],
		});
		expect(postingRequest?.payload).toMatchObject({
			postingDate: seeded.period.periodEnd,
			lines: [],
		});
		expect(paymentCorrection?.payload).toMatchObject({
			originalRunId: finalized.data.id,
			reasonCode: "operational_correction",
			payments: [],
		});
		expect(postingCorrection?.payload).toMatchObject({
			originalRunId: finalized.data.id,
			reasonCode: "operational_correction",
			lines: [],
		});
		expect(seeded.ports.audit.calls.at(-1)?.changes).toContainEqual({
			field: "reason",
			oldValue: null,
			newValue: "Synthetic reversal for lifecycle test",
		});
	});

	it("rejects finalize by the actor who calculated the run (C9 segregation of duties)", async () => {
		const organizationId = "org-run-lifecycle-sod";
		const actorUserId = "user-run-lifecycle-sod-calc";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "sod");
		const options = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator(),
		};

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-sod",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}
		expect(calculated.data.updatedBy).toBe(actorUserId);

		const blocked = await finalizePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: calculated.data.id,
				expectedVersion: calculated.data.version,
			},
			options,
		);
		expect(blocked.ok).toBe(false);
		if (blocked.ok) {
			return;
		}
		expect(blocked.code).toBe("CONFLICT");
	});

	it("allows finalize by a different actor", async () => {
		const organizationId = "org-run-lifecycle-sod-ok";
		const calculateActorUserId = "user-run-lifecycle-sod-calc-ok";
		const finalizeActorUserId = "user-run-lifecycle-sod-fin-ok";
		const seeded = await seedOpenPeriod(
			organizationId,
			calculateActorUserId,
			"sod-ok",
		);
		const options = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator(),
		};

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, calculateActorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-sod-ok",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, calculateActorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}

		const finalized = await finalizePayrollRun(
			{
				...baseContext(organizationId, finalizeActorUserId),
				runId: calculated.data.id,
				expectedVersion: calculated.data.version,
			},
			options,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) {
			return;
		}
		expect(finalized.data.status).toBe("finalized");
		expect(finalized.data.finalizedBy).toBe(finalizeActorUserId);
	});

	it("rejects illegal transitions through commands", async () => {
		const organizationId = "org-run-lifecycle-illegal";
		const actorUserId = "user-run-lifecycle-illegal";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "illegal");
		const options = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator(),
		};

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-illegal",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const blockedFinalize = await finalizePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(blockedFinalize.ok).toBe(false);
		if (blockedFinalize.ok) {
			return;
		}
		expect(blockedFinalize.code).toBe("CONFLICT");
	});

	it("replays create idempotency and rejects fingerprint conflicts", async () => {
		const organizationId = "org-run-lifecycle-idem";
		const actorUserId = "user-run-lifecycle-idem";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "idem");
		const { options } = seeded;
		const createInput = {
			...baseContext(organizationId, actorUserId),
			payGroupId: seeded.payGroup.id,
			periodId: seeded.period.id,
			runType: "regular" as const,
			sequence: 1,
			idempotencyKey: "idem-run-replay",
		};

		const first = await createPayrollRun(createInput, options);
		const second = await createPayrollRun(createInput, options);
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!(first.ok && second.ok)) {
			return;
		}
		expect(second.data.id).toBe(first.data.id);

		const conflict = await createPayrollRun(
			{
				...createInput,
				sequence: 2,
			},
			options,
		);
		expect(conflict.ok).toBe(false);
		if (conflict.ok) {
			return;
		}
		expect(conflict.code).toBe("CONFLICT");
	});

	it("rejects stale expectedVersion on calculate and finalize", async () => {
		const organizationId = "org-run-lifecycle-stale";
		const actorUserId = "user-run-lifecycle-stale";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "stale");
		const options = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator(),
		};

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-stale",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const staleCalculate = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version + 99,
			},
			options,
		);
		expect(staleCalculate.ok).toBe(false);
		if (staleCalculate.ok) {
			return;
		}
		expect(staleCalculate.code).toBe("CONFLICT");

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}

		const staleFinalize = await finalizePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: calculated.data.id,
				expectedVersion: calculated.data.version + 99,
			},
			options,
		);
		expect(staleFinalize.ok).toBe(false);
		if (staleFinalize.ok) {
			return;
		}
		expect(staleFinalize.code).toBe("CONFLICT");
		// Same actor calculated and is retrying finalize with a stale version:
		// the version-conflict wording must win over the segregation-of-duties
		// wording so retry logic sees an optimistic-lock failure, not an
		// authorization failure.
		expect(staleFinalize.message).toBe(
			"The request conflicts with current state",
		);
		expect(staleFinalize.message).not.toContain("Segregation of duties");
	});

	it("handles concurrent calculate attempts with one winner", async () => {
		const organizationId = "org-run-lifecycle-conc-calc";
		const actorUserId = "user-run-lifecycle-conc-calc";
		const seeded = await seedOpenPeriod(
			organizationId,
			actorUserId,
			"conc-calc",
		);
		const options = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator(),
		};

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-conc-calc",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const input = {
			...baseContext(organizationId, actorUserId),
			runId: created.data.id,
			expectedVersion: created.data.version,
		};
		const [first, second] = await Promise.all([
			calculatePayrollRun(input, options),
			calculatePayrollRun(input, options),
		]);

		const outcomes = [first, second];
		const successes = outcomes.filter((result) => result.ok);
		const failures = outcomes.filter((result) => !result.ok);
		expect(successes).toHaveLength(1);
		expect(failures).toHaveLength(1);
		if (!failures[0]?.ok) {
			expect(failures[0].code).toBe("CONFLICT");
		}
	});

	it("handles concurrent finalize attempts with one winner", async () => {
		const organizationId = "org-run-lifecycle-conc-fin";
		const actorUserId = "user-run-lifecycle-conc-fin";
		const seeded = await seedOpenPeriod(
			organizationId,
			actorUserId,
			"conc-fin",
		);
		const options = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator(),
		};

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-conc-fin",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}

		const input = {
			...baseContext(organizationId, "user-run-lifecycle-conc-fin-finalize"),
			runId: calculated.data.id,
			expectedVersion: calculated.data.version,
		};
		const [first, second] = await Promise.all([
			finalizePayrollRun(input, options),
			finalizePayrollRun(input, options),
		]);

		const outcomes = [first, second];
		const successes = outcomes.filter((result) => result.ok);
		const failures = outcomes.filter((result) => !result.ok);
		expect(successes).toHaveLength(1);
		expect(failures).toHaveLength(1);
		if (!failures[0]?.ok) {
			expect(failures[0].code).toBe("CONFLICT");
		}
	});

	it("blocks finalize when blocking exceptions exist", async () => {
		const organizationId = "org-run-lifecycle-block";
		const actorUserId = "user-run-lifecycle-block";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "block");
		const options = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator(),
		};

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-block",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}

		const blocking = await recordPayrollException(
			{
				...baseContext(organizationId, actorUserId),
				runId: calculated.data.id,
				severity: "blocking",
				exceptionCode: "BLOCKER",
				message: "Synthetic blocking exception",
				employeeRef: null,
			},
			options,
		);
		expect(blocking.ok).toBe(true);

		const blocked = await finalizePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: calculated.data.id,
				expectedVersion: calculated.data.version,
			},
			options,
		);
		expect(blocked.ok).toBe(false);
		if (blocked.ok) {
			return;
		}
		expect(blocked.code).toBe("CONFLICT");
	});

	it("allows finalize with warning-only exceptions", async () => {
		const organizationId = "org-run-lifecycle-warn";
		const actorUserId = "user-run-lifecycle-warn";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "warn");
		const options = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator({
				exceptions: [
					{
						severity: "warning",
						exceptionCode: "WARN_ONLY",
						message: "Synthetic warning",
						employeeRef: null,
					},
				],
			}),
		};

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-warn",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}

		const exceptions = await listPayrollExceptionsForRun(
			{
				organizationId,
				actorUserId,
				runId: calculated.data.id,
			},
			options,
		);
		expect(exceptions.ok).toBe(true);
		if (!exceptions.ok) {
			return;
		}
		expect(exceptions.data).toHaveLength(1);

		const finalized = await finalizePayrollRun(
			{
				...baseContext(organizationId, "user-run-lifecycle-warn-finalize"),
				runId: calculated.data.id,
				expectedVersion: calculated.data.version,
			},
			options,
		);
		expect(finalized.ok).toBe(true);
	});

	it("fails calculate when calculator port is missing", async () => {
		const organizationId = "org-run-lifecycle-no-calc";
		const actorUserId = "user-run-lifecycle-no-calc";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "no-calc");
		const { options } = seeded;

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-no-calc",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const blocked = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(blocked.ok).toBe(false);
		if (blocked.ok) {
			return;
		}
		expect(blocked.code).toBe("VALIDATION_ERROR");
	});

	it("transitions calculating to failed when calculator returns blocking exceptions", async () => {
		const organizationId = "org-run-lifecycle-calc-fail";
		const actorUserId = "user-run-lifecycle-calc-fail";
		const seeded = await seedOpenPeriod(
			organizationId,
			actorUserId,
			"calc-fail",
		);
		const options = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator({
				exceptions: [
					{
						severity: "blocking",
						exceptionCode: "CALC_BLOCK",
						message: "Calculator blocking exception",
						employeeRef: "emp-synthetic-1",
					},
				],
			}),
		};

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-calc-fail",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const failed = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(failed.ok).toBe(true);
		if (!failed.ok) {
			return;
		}
		expect(failed.data.status).toBe("failed");
	});

	it("exposes getPayrollRun for calculated runs", async () => {
		const organizationId = "org-run-lifecycle-get";
		const actorUserId = "user-run-lifecycle-get";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "get");
		const options = {
			...seeded.options,
			calculator: createTestPayrollRunCalculator(),
		};

		const created = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-get",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}

		const loaded = await getPayrollRun(
			{
				organizationId,
				actorUserId,
				runId: calculated.data.id,
			},
			options,
		);
		expect(loaded.ok).toBe(true);
		if (!loaded.ok) {
			return;
		}
		expect(loaded.data.status).toBe("calculated");
	});

	it("rolls back finalization facts and state when event publication fails", async () => {
		const organizationId = "org-run-finalize-fault";
		const actorUserId = "user-run-finalize-fault";
		const seeded = await seedOpenPeriod(
			organizationId,
			actorUserId,
			"finalize-fault",
		);
		const calculated = await createPayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-finalize-fault",
			},
			seeded.options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}
		const ready = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: calculated.data.id,
				expectedVersion: calculated.data.version,
			},
			{ ...seeded.options, calculator: createTestPayrollRunCalculator() },
		);
		expect(ready.ok).toBe(true);
		if (!ready.ok) {
			return;
		}

		const failingPorts = createMemoryMutationPorts({ outboxFailAfter: 1 });
		const result = await finalizePayrollRun(
			{
				...baseContext(organizationId, "user-run-finalize-fault-finalize"),
				runId: ready.data.id,
				expectedVersion: ready.data.version,
			},
			{ ...seeded.options, ports: failingPorts },
		);
		expect(result.ok).toBe(false);
		expect(failingPorts.audit.calls).toHaveLength(0);
		expect(failingPorts.outbox.calls).toHaveLength(0);
		const persisted = await seeded.store.getRun({
			organizationId,
			runId: ready.data.id,
		});
		expect(persisted.ok).toBe(true);
		if (persisted.ok) {
			expect(persisted.data?.status).toBe("calculated");
		}
	});
});
