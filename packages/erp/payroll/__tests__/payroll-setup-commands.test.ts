import { describe, expect, it } from "vitest";
import {
	createPayrollPeriod,
	lockPayrollPeriodInputs,
} from "../src/features/payroll-runs/payroll-period";
import { createPayrollRun } from "../src/features/payroll-runs/payroll-run";
import {
	createPayrollCalendar,
	getPayrollCalendar,
} from "../src/features/payroll-setup/calendar";
import {
	createPayrollEarningRule,
	updatePayrollEarningRule,
} from "../src/features/payroll-setup/earning-rule";
import { createPayrollPayGroup } from "../src/features/payroll-setup/pay-group";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_SETUP_MANAGE,
} from "../src/kernel/execution/permissions";
import { createMemoryPayrollStore } from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

function createGrantingAuthorization(
	permissions: string[],
): PayrollAuthorizationPort {
	return {
		can: async ({ permission }) => permissions.includes(permission),
	};
}

function createDenyingAuthorization(): PayrollAuthorizationPort {
	return {
		can: async () => false,
	};
}

function baseContext(organizationId: string, actorUserId: string) {
	return {
		organizationId,
		actorUserId,
		correlationId: "corr-setup-cmd",
	};
}

async function seedCalendarPayGroup(
	organizationId: string,
	actorUserId: string,
	suffix: string,
	permissions: string[] = [PAYROLL_PERMISSION_SETUP_MANAGE],
) {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingAuthorization(permissions);
	const options = { store, ports, authorization };

	const calendar = await createPayrollCalendar(
		{
			...baseContext(organizationId, actorUserId),
			code: `CAL-${suffix}`,
			name: "Primary calendar",
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
			name: "Primary pay group",
			currencyCode: "USD",
			idempotencyKey: `idem-pg-${suffix}`,
		},
		options,
	);
	if (!payGroup.ok) {
		throw new Error(payGroup.message);
	}

	return {
		calendar: calendar.data,
		payGroup: payGroup.data,
		store,
		ports,
		authorization,
		options,
	};
}

describe("payroll setup commands", () => {
	it("does not resolve unrelated run or workforce capabilities", async () => {
		const options = {
			store: createMemoryPayrollStore(),
			ports: createMemoryMutationPorts(),
			authorization: createGrantingAuthorization([
				PAYROLL_PERMISSION_SETUP_MANAGE,
			]),
			get calculator(): never {
				throw new Error("setup commands must not resolve the run calculator");
			},
			get employees(): never {
				throw new Error("setup commands must not resolve workforce queries");
			},
		};

		const result = await createPayrollCalendar(
			{
				...baseContext("org-narrow", "user-narrow"),
				code: "CAL-NARROW",
				name: "Narrow capability calendar",
				timezone: "UTC",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-narrow-capabilities",
			},
			options,
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		const queryOptions = {
			store: options.store,
			authorization: options.authorization,
			get ports(): never {
				throw new Error("setup queries must not resolve mutation ports");
			},
		};
		const queryResult = await getPayrollCalendar(
			{
				...baseContext("org-narrow", "user-narrow"),
				calendarId: result.data.id,
			},
			queryOptions,
		);
		expect(queryResult.ok).toBe(true);
	});

	it("denies mutations without payroll.setup.manage", async () => {
		const result = await createPayrollCalendar(
			{
				...baseContext("org-a", "user-a"),
				code: "CAL-DENY",
				name: "Denied calendar",
				timezone: "UTC",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-deny",
			},
			{
				store: createMemoryPayrollStore(),
				ports: createMemoryMutationPorts(),
				authorization: createDenyingAuthorization(),
			},
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.code).toBe("FORBIDDEN");
	});

	it("isolates organizations on get", async () => {
		const store = createMemoryPayrollStore();
		const ports = createMemoryMutationPorts();
		const auth = createGrantingAuthorization([PAYROLL_PERMISSION_SETUP_MANAGE]);

		const created = await createPayrollCalendar(
			{
				...baseContext("org-a", "user-a"),
				code: "CAL-ISO",
				name: "Org A calendar",
				timezone: "UTC",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-iso",
			},
			{ store, ports, authorization: auth },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const crossOrg = await getPayrollCalendar(
			{
				...baseContext("org-b", "user-b"),
				calendarId: created.data.id,
			},
			{ store, authorization: auth },
		);
		expect(crossOrg.ok).toBe(true);
		if (!crossOrg.ok) {
			return;
		}
		expect(crossOrg.data).toBeNull();
	});

	it("replays idempotent calendar creates with the same fingerprint", async () => {
		const store = createMemoryPayrollStore();
		const ports = createMemoryMutationPorts();
		const auth = createGrantingAuthorization([PAYROLL_PERMISSION_SETUP_MANAGE]);
		const payload = {
			...baseContext("org-idem", "user-idem"),
			code: "CAL-IDEM",
			name: "Idempotent calendar",
			timezone: "UTC",
			effectiveFrom: "2025-01-01",
			idempotencyKey: "idem-replay-cmd",
		};

		const first = await createPayrollCalendar(payload, {
			store,
			ports,
			authorization: auth,
		});
		const second = await createPayrollCalendar(payload, {
			store,
			ports,
			authorization: auth,
		});
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!(first.ok && second.ok)) {
			return;
		}
		expect(second.data.id).toBe(first.data.id);
	});

	it("rejects overlapping active earning rules via command surface", async () => {
		const { payGroup, store, ports, authorization } =
			await seedCalendarPayGroup("org-overlap", "user-overlap", "overlap");

		const first = await createPayrollEarningRule(
			{
				...baseContext("org-overlap", "user-overlap"),
				payGroupId: payGroup.id,
				code: "BASE",
				name: "Base pay",
				ruleType: "fixed",
				amount: "1000.00",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "1",
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-06-30",
				idempotencyKey: "idem-er-1",
			},
			{ store, ports, authorization },
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const overlap = await createPayrollEarningRule(
			{
				...baseContext("org-overlap", "user-overlap"),
				payGroupId: payGroup.id,
				code: "BASE",
				name: "Base pay v2",
				ruleType: "fixed",
				amount: "1100.00",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "2",
				effectiveFrom: "2025-04-01",
				effectiveTo: null,
				idempotencyKey: "idem-er-2",
			},
			{ store, ports, authorization },
		);
		expect(overlap.ok).toBe(false);
	});

	it("blocks update when rule version is referenced by a finalized run", async () => {
		const { payGroup, store, ports, authorization } =
			await seedCalendarPayGroup("org-lock", "user-lock", "lock");
		const options = { store, ports, authorization };

		const created = await createPayrollEarningRule(
			{
				...baseContext("org-lock", "user-lock"),
				payGroupId: payGroup.id,
				code: "LOCKED",
				name: "Locked rule",
				ruleType: "fixed",
				amount: "500.00",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "1",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-lock-er",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const recorded = await store.recordRuleVersionUsedByFinalizedRun({
			organizationId: "org-lock",
			ruleKind: "earning",
			ruleId: created.data.id,
			runId: "00000000-0000-4000-8000-000000000001",
		});
		expect(recorded.ok).toBe(true);

		const blocked = await updatePayrollEarningRule(
			{
				...baseContext("org-lock", "user-lock"),
				ruleId: created.data.id,
				name: "Attempted rename",
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(blocked.ok).toBe(false);
		if (blocked.ok) {
			return;
		}
		expect(blocked.code).toBe("CONFLICT");
	});

	it("locks an open period into inputs_locked after a run exists (C3)", async () => {
		const seeded = await seedCalendarPayGroup(
			"org-period-lock",
			"user-period-lock",
			"plock",
			[PAYROLL_PERMISSION_SETUP_MANAGE, PAYROLL_PERMISSION_RUN_CREATE],
		);
		const { options } = seeded;

		const period = await createPayrollPeriod(
			{
				...baseContext("org-period-lock", "user-period-lock"),
				payGroupId: seeded.payGroup.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
				cutoffDate: "2025-01-28",
				idempotencyKey: "idem-period-plock",
			},
			options,
		);
		expect(period.ok).toBe(true);
		if (!period.ok) {
			return;
		}

		const blockedWithoutRun = await lockPayrollPeriodInputs(
			{
				...baseContext("org-period-lock", "user-period-lock"),
				periodId: period.data.id,
				expectedVersion: period.data.version,
			},
			options,
		);
		expect(blockedWithoutRun.ok).toBe(false);
		if (blockedWithoutRun.ok) {
			return;
		}
		expect(blockedWithoutRun.code).toBe("CONFLICT");

		const run = await createPayrollRun(
			{
				...baseContext("org-period-lock", "user-period-lock"),
				payGroupId: seeded.payGroup.id,
				periodId: period.data.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-plock",
			},
			options,
		);
		expect(run.ok).toBe(true);
		if (!run.ok) {
			return;
		}

		const locked = await lockPayrollPeriodInputs(
			{
				...baseContext("org-period-lock", "user-period-lock"),
				periodId: period.data.id,
				expectedVersion: period.data.version,
			},
			options,
		);
		expect(locked.ok).toBe(true);
		if (!locked.ok) {
			return;
		}
		expect(locked.data.status).toBe("inputs_locked");

		const again = await lockPayrollPeriodInputs(
			{
				...baseContext("org-period-lock", "user-period-lock"),
				periodId: period.data.id,
				expectedVersion: locked.data.version,
			},
			options,
		);
		expect(again.ok).toBe(false);
		if (again.ok) {
			return;
		}
		expect(again.code).toBe("CONFLICT");

		const blockedRun = await createPayrollRun(
			{
				...baseContext("org-period-lock", "user-period-lock"),
				payGroupId: seeded.payGroup.id,
				periodId: period.data.id,
				runType: "regular",
				sequence: 2,
				idempotencyKey: "idem-run-plock-2",
			},
			options,
		);
		expect(blockedRun.ok).toBe(false);
		if (blockedRun.ok) {
			return;
		}
		expect(blockedRun.code).toBe("CONFLICT");
	});
});
