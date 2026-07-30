/**
 * Slice 7.2 — entitlement grant, ledger adjustments, balance derivation, and readback.
 */

import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import type { HumanResourcesEmployeeId } from "../src/brands";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
} from "../src/error-codes";
import {
	accrueLeaveEntitlement,
	adjustLeaveEntitlement,
	carryForwardLeaveEntitlement,
	expireLeaveEntitlement,
	getLeaveBalance,
	getLeaveEntitlement,
	grantLeaveEntitlement,
	reconcileLeaveBalance,
} from "../src/leave/entitlement";
import {
	createLeavePolicy,
	publishLeavePolicy,
} from "../src/leave/leave-policy";
import {
	approveLeaveRequest,
	cancelApprovedLeaveRequest,
	createDraftLeaveRequest,
	submitLeaveRequest,
} from "../src/leave/leave-request";
import { assignPrimaryReportingLine } from "../src/organization/reporting-line";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import {
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG = "org-leave-ledger";
const ACTOR = "user-leave-ledger-employee";
const MANAGER = "user-leave-ledger-manager";

function harness(
	permissions: readonly HumanResourcesPermission[] = HUMAN_RESOURCES_PERMISSION_CODES,
) {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	const identityResolver = createStoreBackedIdentityResolver(store);
	return createTestHumanResourcesCommandOptions({
		store,
		ports,
		authorization,
		identityResolver,
	});
}

async function seedEmployeeEmployment(ready: ReturnType<typeof harness>) {
	const seedReady = {
		...ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
		]),
	};
	const employee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-emp-ledger",
			idempotencyKey: "idem-emp-ledger",
			employeeNumber: "E-LEDGER-1",
			legalName: "Ledger Worker",
		},
		seedReady,
	);
	if (!employee.ok) {
		return employee;
	}

	const mapped = await mapActorToEmployee(ready.store, {
		organizationId: ORG,
		userId: ACTOR,
		employeeId: employee.data.id,
		actorUserId: ACTOR,
		effectiveFrom: "2025-01-01",
	});
	if (!mapped.ok) {
		return mapped;
	}

	const employment = await createEmployment(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-employ-ledger",
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		seedReady,
	);
	if (!employment.ok) {
		return employment;
	}

	return {
		ok: true as const,
		employee: employee.data,
		employment: employment.data,
	};
}

async function seedPublishedPolicy(
	ready: ReturnType<typeof harness>,
	options?: {
		allowsNegativeBalance?: boolean;
		accrualBasis?: "none" | "periodic" | "anniversary";
		accrualFrequency?: "monthly" | "annual" | null;
		accrualQuantityPerPeriod?: string | null;
		carryForwardEnabled?: boolean;
		carryForwardMaxQuantity?: string | null;
		publish?: boolean;
	},
) {
	const policyReady = {
		...ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
		]),
	};

	const created = await createLeavePolicy(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-policy-ledger-create",
			code: `LEDGER-${Math.random().toString(36).slice(2, 8)}`,
			name: "Ledger Leave",
			leaveType: "annual",
			unit: "days",
			paid: true,
			allowsNegativeBalance: options?.allowsNegativeBalance ?? false,
			allowSelfApproval: false,
			effectiveFrom: "2025-01-01",
			allowedEmploymentStatuses: ["active"],
			accrualBasis: options?.accrualBasis,
			accrualFrequency: options?.accrualFrequency,
			accrualQuantityPerPeriod: options?.accrualQuantityPerPeriod,
			carryForwardEnabled: options?.carryForwardEnabled,
			carryForwardMaxQuantity: options?.carryForwardMaxQuantity,
		},
		policyReady,
	);
	if (!created.ok) {
		return created;
	}

	if (options?.publish === false) {
		return created;
	}

	return publishLeavePolicy(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-policy-ledger-publish",
			policyId: created.data.id,
			expectedVersion: created.data.version,
		},
		policyReady,
	);
}

async function seedManagerWithReportingLine(
	ready: ReturnType<typeof harness>,
	employeeId: HumanResourcesEmployeeId,
) {
	const seedReady = {
		...ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
		]),
	};
	const manager = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-mgr-ledger",
			idempotencyKey: "idem-mgr-ledger",
			employeeNumber: "E-MGR-LEDGER",
			legalName: "Ledger Manager",
		},
		seedReady,
	);
	if (!manager.ok) {
		return manager;
	}

	const mapped = await mapActorToEmployee(ready.store, {
		organizationId: ORG,
		userId: MANAGER,
		employeeId: manager.data.id,
		actorUserId: ACTOR,
		effectiveFrom: "2025-01-01",
	});
	if (!mapped.ok) {
		return mapped;
	}

	const assigned = await assignPrimaryReportingLine(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-mgr-ledger-line",
			employeeId,
			managerEmployeeId: manager.data.id,
			startsOn: "2025-01-01",
		},
		{
			...ready,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			]),
		},
	);
	if (!assigned.ok) {
		return assigned;
	}

	return manager;
}

const ENTITLEMENT_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
] as const;

describe("Slice 7.2 — entitlements and balances", () => {
	it("rejects grant on unpublished policy and grants opening balance", async () => {
		const ready = harness([...ENTITLEMENT_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const draftPolicy = await seedPublishedPolicy(ready, { publish: false });
		expect(draftPolicy.ok).toBe(true);
		if (!draftPolicy.ok) {
			return;
		}

		const rejected = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-grant-draft",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: draftPolicy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-grant-draft",
			},
			ready,
		);
		expect(humanResourcesCodeFromResult(rejected)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);

		const published = await seedPublishedPolicy(ready);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-grant-open",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: published.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-grant-open",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const balance = await getLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-balance-open",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(balance.ok).toBe(true);
		if (!balance.ok) {
			return;
		}
		expect(balance.data?.openingQuantity).toBe("10");
		expect(balance.data?.balance).toBe("10");
	});

	it("manual adjust credits and debits with negative-balance guard", async () => {
		const ready = harness([...ENTITLEMENT_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const strictPolicy = await seedPublishedPolicy(ready, {
			allowsNegativeBalance: false,
		});
		expect(strictPolicy.ok).toBe(true);
		if (!strictPolicy.ok) {
			return;
		}

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-grant-manual",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: strictPolicy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-grant-manual",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const credit = await adjustLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-adj-credit",
				entitlementId: granted.data.id,
				delta: "2",
				reason: "Credit top-up",
				idempotencyKey: "idem-adj-credit",
			},
			ready,
		);
		expect(credit.ok).toBe(true);

		const debitBlocked = await adjustLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-adj-debit-block",
				entitlementId: granted.data.id,
				delta: "-8",
				reason: "Over-debit",
				idempotencyKey: "idem-adj-debit-block",
			},
			ready,
		);
		expect(humanResourcesCodeFromResult(debitBlocked)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const negativePolicy = await seedPublishedPolicy(ready, {
			allowsNegativeBalance: true,
		});
		expect(negativePolicy.ok).toBe(true);
		if (!negativePolicy.ok) {
			return;
		}

		const negativeGrant = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-grant-negative",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: negativePolicy.data.id,
				periodStart: "2026-01-01",
				periodEnd: "2026-12-31",
				openingQuantity: "1",
				idempotencyKey: "idem-grant-negative",
			},
			ready,
		);
		expect(negativeGrant.ok).toBe(true);
		if (!negativeGrant.ok) {
			return;
		}

		const debitAllowed = await adjustLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-adj-debit-allow",
				entitlementId: negativeGrant.data.id,
				delta: "-2",
				reason: "Overdraft adjustment",
				idempotencyKey: "idem-adj-debit-allow",
			},
			ready,
		);
		expect(debitAllowed.ok).toBe(true);
		if (!debitAllowed.ok) {
			return;
		}

		const negativeBalance = await getLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-balance-negative",
				entitlementId: negativeGrant.data.id,
			},
			ready,
		);
		expect(negativeBalance.ok).toBe(true);
		if (!negativeBalance.ok) {
			return;
		}
		expect(negativeBalance.data?.balance).toBe("-1");
	});

	it("accrues once with policy quantity guard and ordered ledger", async () => {
		const ready = harness([...ENTITLEMENT_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const policy = await seedPublishedPolicy(ready, {
			accrualBasis: "periodic",
			accrualFrequency: "monthly",
			accrualQuantityPerPeriod: "1.5",
		});
		expect(policy.ok).toBe(true);
		if (!policy.ok) {
			return;
		}

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-grant-accrue",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-grant-accrue",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const mismatch = await accrueLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-accrue-mismatch",
				entitlementId: granted.data.id,
				quantity: "2",
				accrualPeriodStart: "2025-02-01",
				accrualPeriodEnd: "2025-02-28",
				reason: "Wrong quantity",
				idempotencyKey: "idem-accrue-mismatch",
			},
			ready,
		);
		expect(humanResourcesCodeFromResult(mismatch)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const accrualInput = {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-accrue-ledger",
			entitlementId: granted.data.id,
			quantity: "1.5",
			accrualPeriodStart: "2025-01-01",
			accrualPeriodEnd: "2025-01-31",
			reason: "January accrual",
			idempotencyKey: "idem-accrue-ledger",
		};
		const accrued = await accrueLeaveEntitlement(accrualInput, ready);
		const repeated = await accrueLeaveEntitlement(accrualInput, ready);
		expect(accrued.ok).toBe(true);
		expect(repeated.ok).toBe(true);
		if (!(accrued.ok && repeated.ok)) {
			return;
		}
		expect(repeated.data.id).toBe(accrued.data.id);

		await adjustLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-adj-manual-ledger",
				entitlementId: granted.data.id,
				delta: "1",
				reason: "Manual after accrual",
				idempotencyKey: "idem-adj-manual-ledger",
			},
			ready,
		);

		const reconciliation = await reconcileLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-reconcile-ledger",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(reconciliation.ok).toBe(true);
		if (!reconciliation.ok) {
			return;
		}
		expect(reconciliation.data?.adjustmentCount).toBe(2);
		expect(reconciliation.data?.balance).toBe("12.5");
		const kinds = reconciliation.data?.adjustments.map((row) => row.kind);
		expect(kinds).toEqual(["accrual", "manual"]);
		const ordered = reconciliation.data?.adjustments ?? [];
		for (let index = 1; index < ordered.length; index += 1) {
			const previous = ordered[index - 1];
			const current = ordered[index];
			if (!(previous && current)) {
				continue;
			}
			const timeOrder =
				previous.createdAt.getTime() - current.createdAt.getTime();
			expect(timeOrder <= 0).toBe(true);
			if (timeOrder === 0) {
				expect(previous.id.localeCompare(current.id)).toBeLessThanOrEqual(0);
			}
		}
	});

	it("posts consumption and cancellation_reversal ledger effects", async () => {
		const ready = harness([
			...ENTITLEMENT_PERMISSIONS,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
		]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const manager = await seedManagerWithReportingLine(
			ready,
			seeded.employee.id,
		);
		expect(manager.ok).toBe(true);
		if (!manager.ok) {
			return;
		}

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) {
			return;
		}

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-grant-consume",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-grant-consume",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-req-consume",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-02-01",
				endDate: "2025-02-05",
				requestedQuantity: "3",
				idempotencyKey: "idem-req-consume",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const submitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-req-submit-consume",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-req-approve-consume",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
				note: "Approved",
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const afterApprove = await reconcileLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-reconcile-consume",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(afterApprove.ok).toBe(true);
		if (!afterApprove.ok) {
			return;
		}
		expect(afterApprove.data?.balance).toBe("7");
		expect(afterApprove.data?.adjustments.at(-1)?.kind).toBe("consumption");

		const cancelled = await cancelApprovedLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-req-cancel-consume",
				requestId: approved.data.id,
				expectedVersion: approved.data.version,
				note: "Cancelled",
			},
			ready,
		);
		expect(cancelled.ok).toBe(true);
		if (!cancelled.ok) {
			return;
		}

		const afterCancel = await reconcileLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-reconcile-reversal",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(afterCancel.ok).toBe(true);
		if (!afterCancel.ok) {
			return;
		}
		expect(afterCancel.data?.balance).toBe("10");
		expect(afterCancel.data?.adjustments.at(-1)?.kind).toBe(
			"cancellation_reversal",
		);
	});

	it("carry-forward debits source and opens target without double count", async () => {
		const ready = harness([...ENTITLEMENT_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const disabledPolicy = await seedPublishedPolicy(ready, {
			carryForwardEnabled: false,
		});
		expect(disabledPolicy.ok).toBe(true);
		if (!disabledPolicy.ok) {
			return;
		}

		const disabledGrant = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-grant-cf-disabled",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: disabledPolicy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "4",
				idempotencyKey: "idem-grant-cf-disabled",
			},
			ready,
		);
		expect(disabledGrant.ok).toBe(true);
		if (!disabledGrant.ok) {
			return;
		}

		const disabledCarry = await carryForwardLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cf-disabled",
				entitlementId: disabledGrant.data.id,
				newPeriodStart: "2026-01-01",
				newPeriodEnd: "2026-12-31",
				carriedQuantity: "2",
				idempotencyKey: "idem-cf-disabled",
				expectedVersion: disabledGrant.data.version,
			},
			ready,
		);
		expect(humanResourcesCodeFromResult(disabledCarry)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);

		const policy = await seedPublishedPolicy(ready, {
			carryForwardEnabled: true,
			carryForwardMaxQuantity: "3",
		});
		expect(policy.ok).toBe(true);
		if (!policy.ok) {
			return;
		}

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-grant-cf",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-grant-cf",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const overMax = await carryForwardLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cf-over-max",
				entitlementId: granted.data.id,
				newPeriodStart: "2026-01-01",
				newPeriodEnd: "2026-12-31",
				carriedQuantity: "4",
				idempotencyKey: "idem-cf-over-max",
				expectedVersion: granted.data.version,
			},
			ready,
		);
		expect(humanResourcesCodeFromResult(overMax)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const carried = await carryForwardLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cf-ok",
				entitlementId: granted.data.id,
				newPeriodStart: "2026-01-01",
				newPeriodEnd: "2026-12-31",
				carriedQuantity: "3",
				idempotencyKey: "idem-cf-ok",
				expectedVersion: granted.data.version,
			},
			ready,
		);
		expect(carried.ok).toBe(true);
		if (!carried.ok) {
			return;
		}

		const sourceBalance = await getLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-balance-source-cf",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(sourceBalance.ok).toBe(true);
		if (!sourceBalance.ok) {
			return;
		}
		expect(sourceBalance.data?.balance).toBe("2");

		const source = await getLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-get-source-cf",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(source.ok).toBe(true);
		if (!source.ok) {
			return;
		}
		expect(source.data?.status).toBe("carried_forward");

		const targetBalance = await getLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-balance-target-cf",
				entitlementId: carried.data.id,
			},
			ready,
		);
		expect(targetBalance.ok).toBe(true);
		if (!targetBalance.ok) {
			return;
		}
		expect(targetBalance.data?.openingQuantity).toBe("3");
		expect(targetBalance.data?.balance).toBe("3");
	});

	it("expires residual balance and skips expiry adjustment at zero", async () => {
		const ready = harness([...ENTITLEMENT_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) {
			return;
		}

		const withBalance = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-grant-expire",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "6",
				idempotencyKey: "idem-grant-expire",
			},
			ready,
		);
		expect(withBalance.ok).toBe(true);
		if (!withBalance.ok) {
			return;
		}

		const expired = await expireLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-expire",
				entitlementId: withBalance.data.id,
				expectedVersion: withBalance.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		if (!expired.ok) {
			return;
		}
		expect(expired.data.status).toBe("expired");

		const reconciliation = await reconcileLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-reconcile-expire",
				entitlementId: withBalance.data.id,
			},
			ready,
		);
		expect(reconciliation.ok).toBe(true);
		if (!reconciliation.ok) {
			return;
		}
		expect(reconciliation.data?.balance).toBe("0");
		expect(reconciliation.data?.adjustments).toHaveLength(1);
		expect(reconciliation.data?.adjustments[0]?.kind).toBe("expiry");

		const zeroGrant = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-grant-expire-zero",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2026-01-01",
				periodEnd: "2026-12-31",
				openingQuantity: "0",
				idempotencyKey: "idem-grant-expire-zero",
			},
			ready,
		);
		expect(zeroGrant.ok).toBe(true);
		if (!zeroGrant.ok) {
			return;
		}

		const expiredZero = await expireLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-expire-zero",
				entitlementId: zeroGrant.data.id,
				expectedVersion: zeroGrant.data.version,
			},
			ready,
		);
		expect(expiredZero.ok).toBe(true);
		if (!expiredZero.ok) {
			return;
		}

		const zeroReconcile = await reconcileLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-reconcile-expire-zero",
				entitlementId: zeroGrant.data.id,
			},
			ready,
		);
		expect(zeroReconcile.ok).toBe(true);
		if (!zeroReconcile.ok) {
			return;
		}
		expect(zeroReconcile.data?.adjustmentCount).toBe(0);
		expect(zeroReconcile.data?.balance).toBe("0");
	});
});
