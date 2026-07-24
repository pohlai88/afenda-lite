import { describe, expect, it } from "vitest";

import type { PayrollAuthorizationPort } from "../src/authorization";
import {
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVERSE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_SETUP_MANAGE,
} from "../src/permissions";
import { calculatePayrollRun } from "../src/runs/run-calculate-command";
import {
	listPayrollExceptionsForRun,
	recordPayrollException,
} from "../src/runs/exception";
import { finalizePayrollRun } from "../src/runs/finalization";
import { createPayrollPeriod } from "../src/runs/payroll-period";
import { createPayrollRun, getPayrollRun } from "../src/runs/payroll-run";
import { reversePayrollRun } from "../src/runs/reversal";
import { createPayrollCalendar } from "../src/setup/calendar";
import { createPayrollPayGroup } from "../src/setup/pay-group";
import {
	createMemoryPayrollStore,
	createTestPayrollRunCalculator,
} from "../src/testing";
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
	expect(calendar.ok).toBe(true);
	if (!calendar.ok) throw new Error(calendar.message);

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
	expect(payGroup.ok).toBe(true);
	if (!payGroup.ok) throw new Error(payGroup.message);

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
	expect(period.ok).toBe(true);
	if (!period.ok) throw new Error(period.message);

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
	it("runs create → calculate → finalize → reverse", async () => {
		const organizationId = "org-run-lifecycle-happy";
		const actorUserId = "user-run-lifecycle-happy";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "happy");
		const calculator = createTestPayrollRunCalculator({
			snapshotHash: "hash-happy-path",
		});
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
		if (!created.ok) return;
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
		if (!calculated.ok) return;
		expect(calculated.data.status).toBe("calculated");
		expect(calculated.data.calculationSnapshotHash).toBe("hash-happy-path");

		const finalized = await finalizePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: calculated.data.id,
				expectedVersion: calculated.data.version,
			},
			options,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) return;
		expect(finalized.data.status).toBe("finalized");
		expect(finalized.data.finalizedBy).toBe(actorUserId);

		const reversed = await reversePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: finalized.data.id,
				expectedVersion: finalized.data.version,
				reason: "Synthetic reversal for lifecycle test",
			},
			options,
		);
		expect(reversed.ok).toBe(true);
		if (!reversed.ok) return;
		expect(reversed.data.status).toBe("reversed");
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
		if (!created.ok) return;

		const blockedFinalize = await finalizePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(blockedFinalize.ok).toBe(false);
		if (blockedFinalize.ok) return;
		expect(blockedFinalize.details?.payrollCode).toBe("payroll.invalid_state");
	});

	it("replays create idempotency and rejects fingerprint conflicts", async () => {
		const organizationId = "org-run-lifecycle-idem";
		const actorUserId = "user-run-lifecycle-idem";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "idem");
		const options = seeded.options;
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
		if (!first.ok || !second.ok) return;
		expect(second.data.id).toBe(first.data.id);

		const conflict = await createPayrollRun(
			{
				...createInput,
				sequence: 2,
			},
			options,
		);
		expect(conflict.ok).toBe(false);
		if (conflict.ok) return;
		expect(conflict.details?.payrollCode).toBe("payroll.conflict");
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
		if (!created.ok) return;

		const staleCalculate = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version + 99,
			},
			options,
		);
		expect(staleCalculate.ok).toBe(false);
		if (staleCalculate.ok) return;
		expect(staleCalculate.details?.payrollCode).toBe("payroll.stale_version");

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) return;

		const staleFinalize = await finalizePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: calculated.data.id,
				expectedVersion: calculated.data.version + 99,
			},
			options,
		);
		expect(staleFinalize.ok).toBe(false);
		if (staleFinalize.ok) return;
		expect(staleFinalize.details?.payrollCode).toBe("payroll.stale_version");
	});

	it("handles concurrent calculate attempts with one winner", async () => {
		const organizationId = "org-run-lifecycle-conc-calc";
		const actorUserId = "user-run-lifecycle-conc-calc";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "conc-calc");
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
		if (!created.ok) return;

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
			expect(failures[0].details?.payrollCode).toBe("payroll.stale_version");
		}
	});

	it("handles concurrent finalize attempts with one winner", async () => {
		const organizationId = "org-run-lifecycle-conc-fin";
		const actorUserId = "user-run-lifecycle-conc-fin";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "conc-fin");
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
		if (!created.ok) return;

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) return;

		const input = {
			...baseContext(organizationId, actorUserId),
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
			expect(failures[0].details?.payrollCode).toBe("payroll.stale_version");
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
		if (!created.ok) return;

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) return;

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
		if (blocked.ok) return;
		expect(blocked.details?.payrollCode).toBe("payroll.invalid_state");
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
		if (!created.ok) return;

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) return;

		const exceptions = await listPayrollExceptionsForRun(
			{
				organizationId,
				actorUserId,
				runId: calculated.data.id,
			},
			options,
		);
		expect(exceptions.ok).toBe(true);
		if (!exceptions.ok) return;
		expect(exceptions.data).toHaveLength(1);

		const finalized = await finalizePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
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
		const options = seeded.options;

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
		if (!created.ok) return;

		const blocked = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(blocked.ok).toBe(false);
		if (blocked.ok) return;
		expect(blocked.details?.payrollCode).toBe("payroll.validation");
	});

	it("transitions calculating to failed when calculator returns blocking exceptions", async () => {
		const organizationId = "org-run-lifecycle-calc-fail";
		const actorUserId = "user-run-lifecycle-calc-fail";
		const seeded = await seedOpenPeriod(organizationId, actorUserId, "calc-fail");
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
		if (!created.ok) return;

		const failed = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(failed.ok).toBe(true);
		if (!failed.ok) return;
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
		if (!created.ok) return;

		const calculated = await calculatePayrollRun(
			{
				...baseContext(organizationId, actorUserId),
				runId: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) return;

		const loaded = await getPayrollRun(
			{
				organizationId,
				actorUserId,
				runId: calculated.data.id,
			},
			options,
		);
		expect(loaded.ok).toBe(true);
		if (!loaded.ok) return;
		expect(loaded.data.status).toBe("calculated");
	});
});
