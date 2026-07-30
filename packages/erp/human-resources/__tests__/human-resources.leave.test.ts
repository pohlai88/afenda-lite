/**
 * Leave administration rules matrix (HR-LEAVE-01).
 */

import {
	HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
	HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
	HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import type { HumanResourcesEmployeeId } from "../src/brands";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_EFFECTIVE_RANGE_OVERLAP,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import {
	accrueLeaveEntitlement,
	adjustLeaveEntitlement,
	getLeaveBalance,
	grantLeaveEntitlement,
	reconcileLeaveBalance,
} from "../src/leave/entitlement";
import {
	archiveLeavePolicy,
	createLeavePolicy,
	publishLeavePolicy,
	resolveApplicableLeavePolicy,
	updateLeavePolicy,
} from "../src/leave/leave-policy";
import {
	amendLeaveRequest,
	approveLeaveRequest,
	cancelApprovedLeaveRequest,
	createDraftLeaveRequest,
	getApprovedLeaveHandoff,
	getLeaveRequest,
	rejectLeaveRequest,
	returnLeaveRequest,
	submitLeaveRequest,
	withdrawLeaveRequest,
} from "../src/leave/leave-request";
import { assignPrimaryReportingLine } from "../src/organization/reporting-line";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_HANDOFF_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
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

const ORG = "org-leave-a";
const ACTOR = "user-leave-employee";
const MANAGER = "user-leave-manager";
const OTHER = "user-leave-other";

const LEAVE_REQUEST_WORKFLOW_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	HUMAN_RESOURCES_PERMISSION_LEAVE_HANDOFF_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
] as const;

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
			correlationId: "corr-emp-leave",
			idempotencyKey: "idem-emp-leave",
			employeeNumber: "E-LEAVE-1",
			legalName: "Leave Worker",
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
			correlationId: "corr-employ-leave",
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
		code?: string;
		allowsNegativeBalance?: boolean;
		accrualBasis?: "none" | "periodic" | "anniversary";
		accrualFrequency?: "monthly" | "annual" | null;
		accrualQuantityPerPeriod?: string | null;
		carryForwardEnabled?: boolean;
		carryForwardMaxQuantity?: string | null;
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
			correlationId: "corr-policy-create",
			code: options?.code ?? "ANNUAL",
			name: "Annual Leave",
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

	const published = await publishLeavePolicy(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-policy-publish",
			policyId: created.data.id,
			expectedVersion: created.data.version,
		},
		policyReady,
	);
	return published;
}

async function seedManagerEmployee(
	ready: ReturnType<typeof harness>,
	options?: {
		correlationId?: string;
		idempotencyKey?: string;
		employeeNumber?: string;
	},
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
			correlationId: options?.correlationId ?? "corr-mgr-emp",
			idempotencyKey: options?.idempotencyKey ?? "idem-mgr-emp",
			employeeNumber: options?.employeeNumber ?? "E-MGR-1",
			legalName: "Leave Manager",
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

	return manager;
}

async function seedManagerWithReportingLine(
	ready: ReturnType<typeof harness>,
	employeeId: HumanResourcesEmployeeId,
	options?: {
		correlationId?: string;
		idempotencyKey?: string;
		employeeNumber?: string;
	},
) {
	const manager = await seedManagerEmployee(ready, options);
	if (!manager.ok) {
		return manager;
	}

	const assigned = await assignPrimaryReportingLine(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `${options?.correlationId ?? "corr-mgr"}-line`,
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

async function seedLeaveRequestWorkflowFixture(
	ready: ReturnType<typeof harness>,
	options?: {
		allowSelfApproval?: boolean;
		withManagerLine?: boolean;
		openingQuantity?: string;
	},
) {
	const seeded = await seedEmployeeEmployment(ready);
	if (!seeded.ok) {
		return seeded;
	}

	if (options?.withManagerLine !== false) {
		const manager = await seedManagerWithReportingLine(
			ready,
			seeded.employee.id,
			{
				correlationId: "corr-s73-mgr",
				idempotencyKey: "idem-s73-mgr",
				employeeNumber: "E-MGR-S73",
			},
		);
		if (!manager.ok) {
			return manager;
		}
	}

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
			correlationId: "corr-s73-policy",
			code: `S73-${Date.now()}`,
			name: "Slice 7.3 Policy",
			leaveType: "annual",
			unit: "days",
			paid: true,
			allowSelfApproval: options?.allowSelfApproval ?? false,
			effectiveFrom: "2025-01-01",
			allowedEmploymentStatuses: ["active"],
		},
		policyReady,
	);
	if (!created.ok) {
		return created;
	}

	const published = await publishLeavePolicy(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-s73-policy-pub",
			policyId: created.data.id,
			expectedVersion: created.data.version,
		},
		policyReady,
	);
	if (!published.ok) {
		return published;
	}

	const granted = await grantLeaveEntitlement(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-s73-ent",
			employeeId: seeded.employee.id,
			employmentId: seeded.employment.id,
			policyId: published.data.id,
			periodStart: "2025-01-01",
			periodEnd: "2025-12-31",
			openingQuantity: options?.openingQuantity ?? "10",
			idempotencyKey: `idem-s73-ent-${Date.now()}`,
		},
		ready,
	);
	if (!granted.ok) {
		return granted;
	}

	return {
		ok: true as const,
		ready,
		seeded,
		policy: published.data,
		entitlement: granted.data,
	};
}

async function seedApprovedLeaveHandoffFixture(
	ready: ReturnType<typeof harness>,
	key: string,
) {
	const seeded = await seedEmployeeEmployment(ready);
	if (!seeded.ok) {
		return seeded;
	}

	const manager = await seedManagerWithReportingLine(
		ready,
		seeded.employee.id,
		{
			correlationId: `corr-mgr-${key}`,
			idempotencyKey: `idem-mgr-${key}`,
			employeeNumber: `E-MGR-${key}`,
		},
	);
	if (!manager.ok) {
		return manager;
	}

	const policy = await seedPublishedPolicy(ready);
	if (!policy.ok) {
		return policy;
	}

	const granted = await grantLeaveEntitlement(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-ent-${key}`,
			employeeId: seeded.employee.id,
			employmentId: seeded.employment.id,
			policyId: policy.data.id,
			periodStart: "2025-01-01",
			periodEnd: "2025-12-31",
			openingQuantity: "10",
			idempotencyKey: `idem-ent-${key}`,
		},
		ready,
	);
	if (!granted.ok) {
		return granted;
	}

	const draft = await createDraftLeaveRequest(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-draft-${key}`,
			employeeId: seeded.employee.id,
			entitlementId: granted.data.id,
			startDate: "2025-11-03",
			endDate: "2025-11-05",
			requestedQuantity: "3",
			idempotencyKey: `idem-req-${key}`,
		},
		ready,
	);
	if (!draft.ok) {
		return draft;
	}

	const submitted = await submitLeaveRequest(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-submit-${key}`,
			requestId: draft.data.id,
			expectedVersion: draft.data.version,
		},
		ready,
	);
	if (!submitted.ok) {
		return submitted;
	}

	const approved = await approveLeaveRequest(
		{
			organizationId: ORG,
			actorUserId: MANAGER,
			correlationId: `corr-approve-${key}`,
			requestId: submitted.data.id,
			expectedVersion: submitted.data.version,
		},
		ready,
	);
	if (!approved.ok) {
		return approved;
	}

	return {
		ok: true as const,
		seeded,
		policy: policy.data,
		approved: approved.data,
	};
}

describe("Leave policy lifecycle", () => {
	it("creates draft policy, updates, publishes, archives", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
		]);

		const created = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-1",
				code: "SICK",
				name: "Sick Leave",
				leaveType: "sick",
				unit: "days",
				paid: true,
				effectiveFrom: "2025-01-01",
				allowedEmploymentStatuses: ["active"],
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.status).toBe("draft");

		const updated = await updateLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-upd",
				policyId: created.data.id,
				expectedVersion: created.data.version,
				name: "Sick Leave Updated",
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}

		const published = await publishLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-pub",
				policyId: updated.data.id,
				expectedVersion: updated.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}
		expect(published.data.status).toBe("published");

		const archived = await archiveLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-arch",
				policyId: published.data.id,
				expectedVersion: published.data.version,
			},
			ready,
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) {
			return;
		}
		expect(archived.data.status).toBe("archived");
	});
});

describe("Leave entitlement", () => {
	it("grants entitlement and posts manual adjustment", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_ADJUST,
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
		]);
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

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-grant",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-ent-1",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const adjusted = await adjustLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-adj",
				entitlementId: granted.data.id,
				delta: "2",
				reason: "Manual top-up",
				idempotencyKey: "idem-adj-1",
			},
			ready,
		);
		expect(adjusted.ok).toBe(true);
		if (!adjusted.ok) {
			return;
		}

		const balance = await getLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-balance-1",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(balance.ok).toBe(true);
		if (!balance.ok) {
			return;
		}
		expect(balance.data?.balance).toBe("12");
	});

	it("posts governed accrual exactly once for an accrual period", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_ADJUST,
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
		]);
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
				correlationId: "corr-ent-accrual-grant",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-ent-accrual-grant",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}
		const accrualInput = {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-ent-accrual",
			entitlementId: granted.data.id,
			quantity: "1.5",
			accrualPeriodStart: "2025-01-01",
			accrualPeriodEnd: "2025-01-31",
			reason: "January monthly accrual",
			idempotencyKey: "idem-ent-accrual",
		};
		const accrued = await accrueLeaveEntitlement(accrualInput, ready);
		const repeated = await accrueLeaveEntitlement(accrualInput, ready);
		expect(accrued.ok).toBe(true);
		expect(repeated.ok).toBe(true);
		if (!(accrued.ok && repeated.ok)) {
			return;
		}
		expect(repeated.data.id).toBe(accrued.data.id);
		expect(accrued.data.kind).toBe("accrual");
		expect(accrued.data.source).toBe("accrual:2025-01-01:2025-01-31");
		const balance = await getLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-accrual-balance",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(balance.ok).toBe(true);
		if (!balance.ok) {
			return;
		}
		expect(balance.data?.balance).toBe("11.5");
		const reconciliation = await reconcileLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-accrual-reconcile",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(reconciliation.ok).toBe(true);
		if (!reconciliation.ok) {
			return;
		}
		expect(reconciliation.data).toMatchObject({
			openingQuantity: "10",
			adjustmentCount: 1,
			balance: "11.5",
		});
		expect(reconciliation.data?.adjustments).toHaveLength(1);
		expect(reconciliation.data?.adjustments[0]?.kind).toBe("accrual");
		const invalid = await accrueLeaveEntitlement(
			{
				...accrualInput,
				correlationId: "corr-ent-accrual-invalid",
				idempotencyKey: "idem-ent-accrual-invalid",
				accrualPeriodStart: "2025-02-01",
				accrualPeriodEnd: "2025-01-31",
			},
			ready,
		);
		expect(humanResourcesCodeFromResult(invalid)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});
});

describe("Leave request workflow", () => {
	it("submit and approve reduces balance", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const manager = await seedManagerWithReportingLine(
			ready,
			seeded.employee.id,
			{
				correlationId: "corr-mgr-balance",
				idempotencyKey: "idem-mgr-balance",
				employeeNumber: "E-MGR-BALANCE",
			},
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
				correlationId: "corr-ent-req",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-ent-req",
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
				correlationId: "corr-req-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-06-02",
				endDate: "2025-06-04",
				requestedQuantity: "3",
				idempotencyKey: "idem-req-1",
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
				correlationId: "corr-req-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}
		expect(
			ready.ports.outbox.calls.some(
				(e) => e.type === HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
			),
		).toBe(true);

		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-req-approve",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		expect(
			ready.ports.outbox.calls.some(
				(e) => e.type === HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
			),
		).toBe(true);

		const balance = await getLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-balance-after",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(balance.ok).toBe(true);
		if (!balance.ok) {
			return;
		}
		expect(balance.data?.balance).toBe("2");
	});

	it("rejects overlapping submitted requests", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
		]);
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

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-overlap",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-ent-overlap",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const first = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-1",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-07",
				endDate: "2025-07-09",
				requestedQuantity: "3",
				idempotencyKey: "idem-overlap-1",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const firstSubmitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-submit-1",
				requestId: first.data.id,
				expectedVersion: first.data.version,
			},
			ready,
		);
		expect(firstSubmitted.ok).toBe(true);
		if (!firstSubmitted.ok) {
			return;
		}

		const second = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-2",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-08",
				endDate: "2025-07-10",
				requestedQuantity: "3",
				idempotencyKey: "idem-overlap-2",
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}

		const secondSubmitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-submit-2",
				requestId: second.data.id,
				expectedVersion: second.data.version,
			},
			ready,
		);
		expect(secondSubmitted.ok).toBe(false);
		expect(humanResourcesCodeFromResult(secondSubmitted)).toBe(
			HUMAN_RESOURCES_ERROR_EFFECTIVE_RANGE_OVERLAP,
		);
	});

	it("rejects approve when an overlapping draft request exists", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
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
			{
				correlationId: "corr-mgr-overlap-approve",
				idempotencyKey: "idem-mgr-overlap-approve",
			},
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
				correlationId: "corr-ent-overlap-approve",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-ent-overlap-approve",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const submitted = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-approve-submit",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-07",
				endDate: "2025-07-09",
				requestedQuantity: "3",
				idempotencyKey: "idem-overlap-approve-submit",
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const submittedRequest = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-approve-submit-run",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(submittedRequest.ok).toBe(true);
		if (!submittedRequest.ok) {
			return;
		}

		const overlappingDraft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-approve-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-08",
				endDate: "2025-07-10",
				requestedQuantity: "3",
				idempotencyKey: "idem-overlap-approve-draft",
			},
			ready,
		);
		expect(overlappingDraft.ok).toBe(true);
		if (!overlappingDraft.ok) {
			return;
		}

		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-overlap-approve-blocked",
				requestId: submittedRequest.data.id,
				expectedVersion: submittedRequest.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(false);
		expect(humanResourcesCodeFromResult(approved)).toBe(
			HUMAN_RESOURCES_ERROR_EFFECTIVE_RANGE_OVERLAP,
		);
	});

	it("allows non-overlapping submitted requests for the same employee", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
		]);
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

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-non-overlap",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-ent-non-overlap",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const first = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-non-overlap-1",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-07",
				endDate: "2025-07-09",
				requestedQuantity: "3",
				idempotencyKey: "idem-non-overlap-1",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const firstSubmitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-non-overlap-submit-1",
				requestId: first.data.id,
				expectedVersion: first.data.version,
			},
			ready,
		);
		expect(firstSubmitted.ok).toBe(true);
		if (!firstSubmitted.ok) {
			return;
		}

		const second = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-non-overlap-2",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-14",
				endDate: "2025-07-16",
				requestedQuantity: "3",
				idempotencyKey: "idem-non-overlap-2",
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}

		const secondSubmitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-non-overlap-submit-2",
				requestId: second.data.id,
				expectedVersion: second.data.version,
			},
			ready,
		);
		expect(secondSubmitted.ok).toBe(true);
	});

	it("rejects overlapping submit after an approved leave window exists", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const manager = await seedManagerWithReportingLine(
			ready,
			seeded.employee.id,
			{
				correlationId: "corr-mgr-overlap-approved",
				idempotencyKey: "idem-mgr-overlap-approved",
			},
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
				correlationId: "corr-ent-overlap-approved",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-ent-overlap-approved",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const first = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-approved-1",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-07",
				endDate: "2025-07-09",
				requestedQuantity: "3",
				idempotencyKey: "idem-overlap-approved-1",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const firstSubmitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-approved-submit-1",
				requestId: first.data.id,
				expectedVersion: first.data.version,
			},
			ready,
		);
		expect(firstSubmitted.ok).toBe(true);
		if (!firstSubmitted.ok) {
			return;
		}

		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-overlap-approved-approve-1",
				requestId: firstSubmitted.data.id,
				expectedVersion: firstSubmitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const second = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-approved-2",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-08",
				endDate: "2025-07-10",
				requestedQuantity: "3",
				idempotencyKey: "idem-overlap-approved-2",
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}

		const secondSubmitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-overlap-approved-submit-2",
				requestId: second.data.id,
				expectedVersion: second.data.version,
			},
			ready,
		);
		expect(secondSubmitted.ok).toBe(false);
		expect(humanResourcesCodeFromResult(secondSubmitted)).toBe(
			HUMAN_RESOURCES_ERROR_EFFECTIVE_RANGE_OVERLAP,
		);
	});

	it("blocks self-approval when policy disallows it", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
		]);
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

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-self",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-ent-self",
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
				correlationId: "corr-self-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-08-04",
				endDate: "2025-08-06",
				requestedQuantity: "3",
				idempotencyKey: "idem-self-req",
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
				correlationId: "corr-self-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const selfApproved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-self-approve",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(selfApproved.ok).toBe(false);
		expect(humanResourcesCodeFromResult(selfApproved)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("cancel-approved reverses consumption", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const manager = await seedManagerWithReportingLine(
			ready,
			seeded.employee.id,
			{
				correlationId: "corr-mgr-cancel",
				idempotencyKey: "idem-mgr-cancel",
				employeeNumber: "E-MGR-CANCEL",
			},
		);
		expect(manager.ok).toBe(true);
		if (!manager.ok) {
			return;
		}

		const policyReady = {
			...ready,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			]),
		};
		const created = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-self-ok",
				code: "ANNUAL-B",
				name: "Annual B",
				leaveType: "annual",
				unit: "days",
				paid: true,
				allowSelfApproval: true,
				effectiveFrom: "2025-01-01",
				allowedEmploymentStatuses: ["active"],
			},
			policyReady,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const published = await publishLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-self-pub",
				policyId: created.data.id,
				expectedVersion: created.data.version,
			},
			policyReady,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-cancel",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: published.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-ent-cancel",
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
				correlationId: "corr-cancel-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-09-01",
				endDate: "2025-09-03",
				requestedQuantity: "3",
				idempotencyKey: "idem-cancel-req",
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
				correlationId: "corr-cancel-submit",
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
				correlationId: "corr-cancel-approve",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const cancelled = await cancelApprovedLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cancel",
				requestId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(cancelled.ok).toBe(true);
		if (!cancelled.ok) {
			return;
		}
		expect(cancelled.data.status).toBe("cancelled");
		expect(
			ready.ports.outbox.calls.some(
				(e) => e.type === HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
			),
		).toBe(true);

		const balance = await getLeaveBalance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-balance-cancel",
				entitlementId: granted.data.id,
			},
			ready,
		);
		expect(balance.ok).toBe(true);
		if (!balance.ok) {
			return;
		}
		expect(balance.data?.balance).toBe("5");
	});

	it("rejects submit when balance is insufficient", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
		]);
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

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-insufficient",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "2",
				idempotencyKey: "idem-ent-insufficient",
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
				correlationId: "corr-insufficient-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-10-06",
				endDate: "2025-10-08",
				requestedQuantity: "3",
				idempotencyKey: "idem-insufficient-req",
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
				correlationId: "corr-insufficient-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(false);
		expect(humanResourcesCodeFromResult(submitted)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("skips weekend days when expanding calendar segments", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
		]);
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

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-weekend",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-ent-weekend",
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
				correlationId: "corr-weekend-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-06-06",
				endDate: "2025-06-09",
				requestedQuantity: "2",
				idempotencyKey: "idem-weekend-req",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const segments = await ready.store.listLeaveRequestSegments({
			organizationId: ORG,
			requestId: draft.data.id,
		});
		expect(segments.ok).toBe(true);
		if (!segments.ok) {
			return;
		}
		expect(segments.data).toHaveLength(2);
		expect(segments.data.map((segment) => segment.segmentDate)).toEqual([
			"2025-06-06",
			"2025-06-09",
		]);
	});
});

describe("Slice 7.3 leave request workflow", () => {
	it("submit transitions draft to submitted", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const fixture = await seedLeaveRequestWorkflowFixture(ready);
		expect(fixture.ok).toBe(true);
		if (!fixture.ok) {
			return;
		}

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-submit-draft",
				employeeId: fixture.seeded.employee.id,
				entitlementId: fixture.entitlement.id,
				startDate: "2025-11-03",
				endDate: "2025-11-05",
				requestedQuantity: "3",
				idempotencyKey: "idem-s73-submit",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}
		expect(draft.data.status).toBe("draft");

		const submitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}
		expect(submitted.data.status).toBe("submitted");
	});

	it("amends draft request and re-expands segments", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const fixture = await seedLeaveRequestWorkflowFixture(ready);
		expect(fixture.ok).toBe(true);
		if (!fixture.ok) {
			return;
		}

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-amend-draft",
				employeeId: fixture.seeded.employee.id,
				entitlementId: fixture.entitlement.id,
				startDate: "2025-11-10",
				endDate: "2025-11-12",
				requestedQuantity: "3",
				idempotencyKey: "idem-s73-amend-draft",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const amended = await amendLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-amend-draft-run",
				requestId: draft.data.id,
				startDate: "2025-11-17",
				endDate: "2025-11-18",
				requestedQuantity: "2",
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(amended.ok).toBe(true);
		if (!amended.ok) {
			return;
		}
		expect(amended.data.status).toBe("draft");
		expect(amended.data.startDate).toBe("2025-11-17");
		expect(amended.data.requestedQuantity).toBe("2");
	});

	it("denies amend when request is submitted", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const fixture = await seedLeaveRequestWorkflowFixture(ready);
		expect(fixture.ok).toBe(true);
		if (!fixture.ok) {
			return;
		}

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-amend-deny-draft",
				employeeId: fixture.seeded.employee.id,
				entitlementId: fixture.entitlement.id,
				startDate: "2025-11-24",
				endDate: "2025-11-26",
				requestedQuantity: "3",
				idempotencyKey: "idem-s73-amend-deny",
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
				correlationId: "corr-s73-amend-deny-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const denied = await amendLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-amend-deny",
				requestId: submitted.data.id,
				startDate: "2025-12-01",
				endDate: "2025-12-02",
				requestedQuantity: "2",
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
	});

	it("rejects submitted request via primary manager", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const fixture = await seedLeaveRequestWorkflowFixture(ready);
		expect(fixture.ok).toBe(true);
		if (!fixture.ok) {
			return;
		}

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-reject-draft",
				employeeId: fixture.seeded.employee.id,
				entitlementId: fixture.entitlement.id,
				startDate: "2025-12-08",
				endDate: "2025-12-10",
				requestedQuantity: "3",
				idempotencyKey: "idem-s73-reject",
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
				correlationId: "corr-s73-reject-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const rejected = await rejectLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-s73-reject",
				requestId: submitted.data.id,
				note: "Not approved",
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(rejected.ok).toBe(true);
		if (!rejected.ok) {
			return;
		}
		expect(rejected.data.status).toBe("rejected");
	});

	it("denies reject from non-primary manager", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const fixture = await seedLeaveRequestWorkflowFixture(ready);
		expect(fixture.ok).toBe(true);
		if (!fixture.ok) {
			return;
		}

		const otherManager = await seedManagerEmployee(ready, {
			correlationId: "corr-s73-other-mgr",
			idempotencyKey: "idem-s73-other-mgr",
			employeeNumber: "E-MGR-OTHER",
		});
		expect(otherManager.ok).toBe(true);
		if (!otherManager.ok) {
			return;
		}

		const otherMapped = await mapActorToEmployee(ready.store, {
			organizationId: ORG,
			userId: OTHER,
			employeeId: otherManager.data.id,
			actorUserId: ACTOR,
			effectiveFrom: "2025-01-01",
		});
		expect(otherMapped.ok).toBe(true);
		if (!otherMapped.ok) {
			return;
		}

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-reject-mgr-draft",
				employeeId: fixture.seeded.employee.id,
				entitlementId: fixture.entitlement.id,
				startDate: "2025-12-15",
				endDate: "2025-12-17",
				requestedQuantity: "3",
				idempotencyKey: "idem-s73-reject-mgr",
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
				correlationId: "corr-s73-reject-mgr-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const denied = await rejectLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: OTHER,
				correlationId: "corr-s73-reject-mgr-deny",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("allows self-approval when policy permits and actor is the request employee", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const fixture = await seedLeaveRequestWorkflowFixture(ready, {
			allowSelfApproval: true,
			withManagerLine: false,
		});
		expect(fixture.ok).toBe(true);
		if (!fixture.ok) {
			return;
		}

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-self-allow-draft",
				employeeId: fixture.seeded.employee.id,
				entitlementId: fixture.entitlement.id,
				startDate: "2026-01-05",
				endDate: "2026-01-07",
				requestedQuantity: "3",
				idempotencyKey: "idem-s73-self-allow",
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
				correlationId: "corr-s73-self-allow-submit",
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
				actorUserId: ACTOR,
				correlationId: "corr-s73-self-allow-approve",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		expect(approved.data.status).toBe("approved");
	});

	it("requires backdate permission for backdated amend", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const fixture = await seedLeaveRequestWorkflowFixture(ready);
		expect(fixture.ok).toBe(true);
		if (!fixture.ok) {
			return;
		}

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-backdate-amend-draft",
				employeeId: fixture.seeded.employee.id,
				entitlementId: fixture.entitlement.id,
				startDate: "2026-01-12",
				endDate: "2026-01-14",
				requestedQuantity: "3",
				idempotencyKey: "idem-s73-backdate-amend",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const denied = await amendLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-backdate-amend-deny",
				requestId: draft.data.id,
				startDate: "2025-04-01",
				endDate: "2025-04-02",
				requestedQuantity: "2",
				isBackdated: true,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("allows cancel-approved via backdate-only permission", async () => {
		const backdateOnlyReady = {
			...harness([
				...LEAVE_REQUEST_WORKFLOW_PERMISSIONS,
				HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
			]),
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
				HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
				HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
				HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
				HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
				HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
				HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
			]),
		};
		const fixture = await seedLeaveRequestWorkflowFixture(backdateOnlyReady);
		expect(fixture.ok).toBe(true);
		if (!fixture.ok) {
			return;
		}

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-cancel-backdate-draft",
				employeeId: fixture.seeded.employee.id,
				entitlementId: fixture.entitlement.id,
				startDate: "2026-01-19",
				endDate: "2026-01-21",
				requestedQuantity: "3",
				idempotencyKey: "idem-s73-cancel-backdate",
			},
			backdateOnlyReady,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const submitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-cancel-backdate-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			backdateOnlyReady,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const approveReady = {
			...backdateOnlyReady,
			authorization: createGrantingHumanResourcesAuthorization([
				...LEAVE_REQUEST_WORKFLOW_PERMISSIONS,
				HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
			]),
		};
		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-s73-cancel-backdate-approve",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			approveReady,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const cancelled = await cancelApprovedLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-s73-cancel-backdate",
				requestId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			backdateOnlyReady,
		);
		expect(cancelled.ok).toBe(true);
		if (!cancelled.ok) {
			return;
		}
		expect(cancelled.data.status).toBe("cancelled");
	});
});

describe("Leave plan matrix (HR-LEAVE-01)", () => {
	it("resolves applicable published policy for employee", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
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

		const resolved = await resolveApplicableLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-resolve-policy",
				policyCode: "ANNUAL",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				asOfDate: "2025-06-01",
			},
			ready,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) {
			return;
		}
		expect(resolved.data?.policy.id).toBe(policy.data.id);
		expect(resolved.data?.policy.status).toBe("published");
	});

	it("amends returned request and re-expands segments", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const manager = await seedManagerEmployee(ready);
		expect(manager.ok).toBe(true);
		if (!manager.ok) {
			return;
		}

		const assigned = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-reporting-line",
				employeeId: seeded.employee.id,
				managerEmployeeId: manager.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) {
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
				correlationId: "corr-ent-amend",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-ent-amend",
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
				correlationId: "corr-amend-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-09-01",
				endDate: "2025-09-03",
				requestedQuantity: "3",
				idempotencyKey: "idem-amend-req",
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
				correlationId: "corr-amend-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const returned = await returnLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-amend-return",
				requestId: submitted.data.id,

				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(returned.ok).toBe(true);
		if (!returned.ok) {
			return;
		}
		expect(returned.data.status).toBe("returned");

		const amended = await amendLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-amend",
				requestId: returned.data.id,
				startDate: "2025-09-08",
				endDate: "2025-09-09",
				requestedQuantity: "2",
				expectedVersion: returned.data.version,
			},
			ready,
		);
		expect(amended.ok).toBe(true);
		if (!amended.ok) {
			return;
		}
		expect(amended.data.startDate).toBe("2025-09-08");
		expect(amended.data.requestedQuantity).toBe("2");

		const segments = await ready.store.listLeaveRequestSegments({
			organizationId: ORG,
			requestId: amended.data.id,
		});
		expect(segments.ok).toBe(true);
		if (!segments.ok) {
			return;
		}
		expect(segments.data).toHaveLength(2);
	});

	it("requires primary manager on approve when reporting line exists", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const manager = await seedManagerEmployee(ready);
		expect(manager.ok).toBe(true);
		if (!manager.ok) {
			return;
		}

		const assigned = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-mgr-line",
				employeeId: seeded.employee.id,
				managerEmployeeId: manager.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) {
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
				correlationId: "corr-ent-mgr",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-ent-mgr",
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
				correlationId: "corr-mgr-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-10-06",
				endDate: "2025-10-08",
				requestedQuantity: "3",
				idempotencyKey: "idem-mgr-req",
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
				correlationId: "corr-mgr-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		// Non-manager actor cannot approve even with approve-team permission.
		const outsider = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: OTHER,
				correlationId: "corr-mgr-outsider",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(outsider.ok).toBe(false);
		expect(humanResourcesCodeFromResult(outsider)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		// Spoofed client managerEmployeeId is rejected by schema (server derives manager).
		const spoofed = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-mgr-spoof",
				requestId: submitted.data.id,
				managerEmployeeId: seeded.employee.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(spoofed.ok).toBe(false);

		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-mgr-approve",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		expect(approved.data.status).toBe("approved");
	});

	it("requires leave.handoff.read (not leave-request.approve-team) for approved handoff query", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const fixture = await seedApprovedLeaveHandoffFixture(
			ready,
			"handoff-perm",
		);
		expect(fixture.ok).toBe(true);
		if (!fixture.ok) {
			return;
		}

		const approveTeamOnlyReady = {
			...ready,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
			]),
		};
		const denied = await getApprovedLeaveHandoff(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-handoff-perm-deny",
				requestId: fixture.approved.id,
			},
			approveTeamOnlyReady,
		);
		expect(denied.ok).toBe(false);
		if (denied.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const handoffReadOnlyReady = {
			...ready,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_LEAVE_HANDOFF_READ,
			]),
		};
		const allowed = await getApprovedLeaveHandoff(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-perm-allow",
				requestId: fixture.approved.id,
			},
			handoffReadOnlyReady,
		);
		expect(allowed.ok).toBe(true);
		if (!allowed.ok) {
			return;
		}
		expect(allowed.data).not.toBeNull();
	});

	it("returns approved leave handoff with plan shape", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const fixture = await seedApprovedLeaveHandoffFixture(
			ready,
			"handoff-shape",
		);
		expect(fixture.ok).toBe(true);
		if (!fixture.ok) {
			return;
		}

		const handoff = await getApprovedLeaveHandoff(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-get",
				requestId: fixture.approved.id,
			},
			ready,
		);
		expect(handoff.ok).toBe(true);
		if (!handoff.ok) {
			return;
		}
		expect(handoff.data).not.toBeNull();
		if (!handoff.data) {
			return;
		}
		expect(handoff.data.employmentId).toBe(fixture.seeded.employment.id);
		expect(handoff.data.policyVersion).toBe(fixture.policy.version);
		expect(handoff.data.paid).toBe(true);
		expect(handoff.data.correlationId).toBe("corr-handoff-get");
		expect(handoff.data.segments.length).toBeGreaterThan(0);
		expect(handoff.data.segments[0]).toHaveProperty("date");
	});

	it("denies sensitive leave read without permission", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const policyReady = {
			...ready,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			]),
		};
		const created = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-sensitive-create",
				code: "SENSITIVE",
				name: "Sensitive Leave",
				leaveType: "other",
				unit: "days",
				paid: true,
				sensitive: true,
				effectiveFrom: "2025-01-01",
				allowedEmploymentStatuses: ["active"],
			},
			policyReady,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const published = await publishLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-sensitive-pub",
				policyId: created.data.id,
				expectedVersion: created.data.version,
			},
			policyReady,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-sensitive",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: published.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-ent-sensitive",
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
				correlationId: "corr-sensitive-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-12-01",
				endDate: "2025-12-02",
				requestedQuantity: "2",
				idempotencyKey: "idem-sensitive-req",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const denied = await getLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: OTHER,
				correlationId: "corr-sensitive-deny",
				requestId: draft.data.id,
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
				]),
			},
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const allowed = await getLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: OTHER,
				correlationId: "corr-sensitive-allow",
				requestId: draft.data.id,
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
					HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
				]),
			},
		);
		expect(allowed.ok).toBe(true);
	});

	it("requires backdate permission for backdated create", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
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

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-backdate",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-ent-backdate",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const denied = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-backdate-deny",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-05-01",
				endDate: "2025-05-02",
				requestedQuantity: "2",
				isBackdated: true,
				idempotencyKey: "idem-backdate-deny",
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const allowed = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-backdate-allow",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-05-01",
				endDate: "2025-05-02",
				requestedQuantity: "2",
				isBackdated: true,
				idempotencyKey: "idem-backdate-allow",
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					...LEAVE_REQUEST_WORKFLOW_PERMISSIONS,
					HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
				]),
			},
		);
		expect(allowed.ok).toBe(true);
		if (!allowed.ok) {
			return;
		}
		expect(allowed.data.isBackdated).toBe(true);
	});

	it("rejects stale expectedVersion on approve", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const manager = await seedManagerWithReportingLine(
			ready,
			seeded.employee.id,
			{
				correlationId: "corr-mgr-stale",
				idempotencyKey: "idem-mgr-stale",
				employeeNumber: "E-MGR-STALE",
			},
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
				correlationId: "corr-ent-stale",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-ent-stale",
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
				correlationId: "corr-stale-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-04-07",
				endDate: "2025-04-09",
				requestedQuantity: "3",
				idempotencyKey: "idem-stale-req",
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
				correlationId: "corr-stale-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const stale = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-stale-approve",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version - 1,
			},
			ready,
		);
		expect(stale.ok).toBe(false);
		expect(humanResourcesCodeFromResult(stale)).toBe(
			HUMAN_RESOURCES_ERROR_STALE_VERSION,
		);
	});

	it("returns same draft for idempotent create", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
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

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-idem",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-ent-idem",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}

		const payload = {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-idem-draft",
			employeeId: seeded.employee.id,
			entitlementId: granted.data.id,
			startDate: "2025-03-03",
			endDate: "2025-03-05",
			requestedQuantity: "3",
			idempotencyKey: "idem-create-req",
		};
		const first = await createDraftLeaveRequest(payload, ready);
		const second = await createDraftLeaveRequest(
			{ ...payload, correlationId: "corr-idem-draft-2" },
			ready,
		);
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!(first.ok && second.ok)) {
			return;
		}
		expect(second.data.id).toBe(first.data.id);
	});

	it("creates half-day segment for morning portion", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
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

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-half",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-ent-half",
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
				correlationId: "corr-half-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-02-03",
				endDate: "2025-02-03",
				requestedQuantity: "0.5",
				dayPortion: "morning",
				idempotencyKey: "idem-half-req",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const segments = await ready.store.listLeaveRequestSegments({
			organizationId: ORG,
			requestId: draft.data.id,
		});
		expect(segments.ok).toBe(true);
		if (!segments.ok) {
			return;
		}
		expect(segments.data).toHaveLength(1);
		expect(segments.data[0]?.dayPortion).toBe("morning");
		expect(segments.data[0]?.quantity).toBe("0.5");
	});

	it("withdraws submitted request", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
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

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-withdraw",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "5",
				idempotencyKey: "idem-ent-withdraw",
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
				correlationId: "corr-withdraw-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-14",
				endDate: "2025-07-16",
				requestedQuantity: "3",
				idempotencyKey: "idem-withdraw-req",
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
				correlationId: "corr-withdraw-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const withdrawn = await withdrawLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-withdraw",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(withdrawn.ok).toBe(true);
		if (!withdrawn.ok) {
			return;
		}
		expect(withdrawn.data.status).toBe("withdrawn");
	});
});
