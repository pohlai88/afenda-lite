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
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
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
	updateLeavePolicy,
} from "../src/leave/leave-policy";
import {
	approveLeaveRequest,
	cancelApprovedLeaveRequest,
	createDraftLeaveRequest,
	submitLeaveRequest,
} from "../src/leave/leave-request";
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
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG = "org-leave-a";
const ACTOR = "user-leave-employee";
const MANAGER = "user-leave-manager";

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

	return { ok: true as const, employee: employee.data, employment: employment.data };
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
		expect(ready.ports.outbox.calls.some((e) => e.type === HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT)).toBe(
			true,
		);

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
		expect(ready.ports.outbox.calls.some((e) => e.type === HUMAN_RESOURCES_LEAVE_APPROVED_EVENT)).toBe(
			true,
		);

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
