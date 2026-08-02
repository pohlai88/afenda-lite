import { describe, expect, it } from "vitest";
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
import { PAYROLL_PERMISSION_SETUP_MANAGE } from "../src/kernel/execution/permissions";
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
) {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingAuthorization([
		PAYROLL_PERMISSION_SETUP_MANAGE,
	]);
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
});
