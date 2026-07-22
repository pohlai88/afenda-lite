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
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import {
	adjustLeaveEntitlement,
	getLeaveBalance,
	grantLeaveEntitlement,
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
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
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
	return { store, ports, authorization };
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
	if (!employee.ok) return employee;

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
	if (!employment.ok) return employment;

	return {
		ok: true as const,
		employee: employee.data,
		employment: employment.data,
	};
}

async function seedPublishedPolicy(ready: ReturnType<typeof harness>) {
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
			code: "ANNUAL",
			name: "Annual Leave",
			leaveType: "annual",
			unit: "days",
			paid: true,
			allowsNegativeBalance: false,
			allowSelfApproval: false,
			effectiveFrom: "2025-01-01",
			allowedEmploymentStatuses: ["active"],
		},
		policyReady,
	);
	if (!created.ok) return created;

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

async function seedManagerEmployee(ready: ReturnType<typeof harness>) {
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
			correlationId: "corr-mgr-emp",
			idempotencyKey: "idem-mgr-emp",
			employeeNumber: "E-MGR-1",
			legalName: "Leave Manager",
		},
		seedReady,
	);
	return manager;
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
		if (!created.ok) return;
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
		if (!updated.ok) return;

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
		if (!published.ok) return;
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
		if (!archived.ok) return;
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
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!adjusted.ok) return;

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
		if (!balance.ok) return;
		expect(balance.data?.balance).toBe("12");
	});
});

describe("Leave request workflow", () => {
	it("submit and approve reduces balance", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
		]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

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
		if (!submitted.ok) return;
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
		if (!approved.ok) return;
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
		if (!balance.ok) return;
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
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!first.ok) return;

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
		if (!firstSubmitted.ok) return;

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
		if (!second.ok) return;

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
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
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
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

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
		if (!submitted.ok) return;

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
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
		]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

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
		if (!created.ok) return;
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
		if (!published.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

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
		if (!submitted.ok) return;

		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cancel-approve",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

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
		if (!cancelled.ok) return;
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
		if (!balance.ok) return;
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
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

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
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

		const segments = await ready.store.listLeaveRequestSegments({
			organizationId: ORG,
			requestId: draft.data.id,
		});
		expect(segments.ok).toBe(true);
		if (!segments.ok) return;
		expect(segments.data).toHaveLength(2);
		expect(segments.data.map((segment) => segment.segmentDate)).toEqual([
			"2025-06-06",
			"2025-06-09",
		]);
	});
});

describe("Leave plan matrix (HR-LEAVE-01)", () => {
	it("resolves applicable published policy for employee", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!resolved.ok) return;
		expect(resolved.data?.policy.id).toBe(policy.data.id);
		expect(resolved.data?.policy.status).toBe("published");
	});

	it("amends returned request and re-expands segments", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const manager = await seedManagerEmployee(ready);
		expect(manager.ok).toBe(true);
		if (!manager.ok) return;

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
		if (!assigned.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

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
		if (!submitted.ok) return;

		const returned = await returnLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-amend-return",
				requestId: submitted.data.id,
				managerEmployeeId: manager.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(returned.ok).toBe(true);
		if (!returned.ok) return;
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
		if (!amended.ok) return;
		expect(amended.data.startDate).toBe("2025-09-08");
		expect(amended.data.requestedQuantity).toBe("2");

		const segments = await ready.store.listLeaveRequestSegments({
			organizationId: ORG,
			requestId: amended.data.id,
		});
		expect(segments.ok).toBe(true);
		if (!segments.ok) return;
		expect(segments.data).toHaveLength(2);
	});

	it("requires primary manager on approve when reporting line exists", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const manager = await seedManagerEmployee(ready);
		expect(manager.ok).toBe(true);
		if (!manager.ok) return;

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
		if (!assigned.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

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
		if (!submitted.ok) return;

		const missingManager = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-mgr-missing",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(missingManager.ok).toBe(false);
		expect(humanResourcesCodeFromResult(missingManager)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const wrongManager = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-mgr-wrong",
				requestId: submitted.data.id,
				managerEmployeeId: seeded.employee.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(wrongManager.ok).toBe(false);
		expect(humanResourcesCodeFromResult(wrongManager)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-mgr-approve",
				requestId: submitted.data.id,
				managerEmployeeId: manager.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		expect(approved.data.status).toBe("approved");
	});

	it("returns approved leave handoff with plan shape", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ent-handoff",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				policyId: policy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: "idem-ent-handoff",
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) return;

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-draft",
				employeeId: seeded.employee.id,
				entitlementId: granted.data.id,
				startDate: "2025-11-03",
				endDate: "2025-11-05",
				requestedQuantity: "3",
				idempotencyKey: "idem-handoff-req",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

		const submitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;

		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-handoff-approve",
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const handoff = await getApprovedLeaveHandoff(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-get",
				requestId: approved.data.id,
			},
			ready,
		);
		expect(handoff.ok).toBe(true);
		if (!handoff.ok) return;
		expect(handoff.data).not.toBeNull();
		if (!handoff.data) return;
		expect(handoff.data.employmentId).toBe(seeded.employment.id);
		expect(handoff.data.policyVersion).toBe(policy.data.version);
		expect(handoff.data.paid).toBe(true);
		expect(handoff.data.correlationId).toBe("corr-handoff-get");
		expect(handoff.data.segments.length).toBeGreaterThan(0);
		expect(handoff.data.segments[0]).toHaveProperty("date");
	});

	it("denies sensitive leave read without permission", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

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
		if (!created.ok) return;
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
		if (!published.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

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
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!allowed.ok) return;
		expect(allowed.data.isBackdated).toBe(true);
	});

	it("rejects stale expectedVersion on approve", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

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
		if (!submitted.ok) return;

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
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!first.ok || !second.ok) return;
		expect(second.data.id).toBe(first.data.id);
	});

	it("creates half-day segment for morning portion", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

		const segments = await ready.store.listLeaveRequestSegments({
			organizationId: ORG,
			requestId: draft.data.id,
		});
		expect(segments.ok).toBe(true);
		if (!segments.ok) return;
		expect(segments.data).toHaveLength(1);
		expect(segments.data[0]?.dayPortion).toBe("morning");
		expect(segments.data[0]?.quantity).toBe("0.5");
	});

	it("withdraws submitted request", async () => {
		const ready = harness([...LEAVE_REQUEST_WORKFLOW_PERMISSIONS]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const policy = await seedPublishedPolicy(ready);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

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
		if (!granted.ok) return;

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
		if (!draft.ok) return;

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
		if (!submitted.ok) return;

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
		if (!withdrawn.ok) return;
		expect(withdrawn.data.status).toBe("withdrawn");
	});
});
