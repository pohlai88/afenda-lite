/**
 * Memory vs Drizzle parity for leave administration (HR-LEAVE-01).
 */

import { afterAll, describe, expect, it } from "vitest";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { grantLeaveEntitlement } from "../src/leave/entitlement";
import {
	createLeavePolicy,
	publishLeavePolicy,
} from "../src/leave/leave-policy";
import {
	approveLeaveRequest,
	createDraftLeaveRequest,
	getApprovedLeaveHandoff,
	submitLeaveRequest,
} from "../src/leave/leave-request";
import { assignPrimaryReportingLine } from "../src/organization/reporting-line";
import { HUMAN_RESOURCES_ERROR_EFFECTIVE_RANGE_OVERLAP } from "../src/error-codes";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { mapActorToEmployee } from "./helpers/identity-resolver";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defineLeaveParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-leave-parity-${suffix}`);
	const ACTOR = `user-hr-leave-parity-${suffix}`;
	const MANAGER = `user-hr-leave-mgr-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("approve + handoff parity", async () => {
		const ready = createHrParityHarness(adapter);

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-emp-${suffix}`,
				idempotencyKey: `idem-emp-${suffix}`,
				employeeNumber: `E-${suffix}`,
				legalName: `Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const actorMapped = await mapActorToEmployee(ready.store, {
			organizationId: ORG,
			userId: ACTOR,
			employeeId: employee.data.id,
			actorUserId: ACTOR,
			effectiveFrom: "2025-01-01",
		});
		expect(actorMapped.ok).toBe(true);
		if (!actorMapped.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employ-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const policy = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-${suffix}`,
				code: `ANNUAL-${suffix}`,
				name: "Annual Leave",
				leaveType: "annual",
				unit: "days",
				paid: true,
				allowSelfApproval: true,
				effectiveFrom: "2025-01-01",
				allowedEmploymentStatuses: ["active"],
			},
			ready,
		);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

		const published = await publishLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pub-${suffix}`,
				policyId: policy.data.id,
				expectedVersion: policy.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ent-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				policyId: published.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: `idem-ent-${suffix}`,
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) return;

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-draft-${suffix}`,
				employeeId: employee.data.id,
				entitlementId: granted.data.id,
				startDate: "2025-08-04",
				endDate: "2025-08-06",
				requestedQuantity: "3",
				idempotencyKey: `idem-req-${suffix}`,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

		const submitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-submit-${suffix}`,
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;

		const manager = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-mgr-${suffix}`,
				idempotencyKey: `idem-mgr-${suffix}`,
				employeeNumber: `MGR-${suffix}`,
				legalName: `Manager ${suffix}`,
			},
			ready,
		);
		expect(manager.ok).toBe(true);
		if (!manager.ok) return;

		const managerMapped = await mapActorToEmployee(ready.store, {
			organizationId: ORG,
			userId: MANAGER,
			employeeId: manager.data.id,
			actorUserId: ACTOR,
			effectiveFrom: "2025-01-01",
		});
		expect(managerMapped.ok).toBe(true);
		if (!managerMapped.ok) return;

		const reportingLine = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-line-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: manager.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(reportingLine.ok).toBe(true);
		if (!reportingLine.ok) return;

		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-approve-${suffix}`,
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		expect(approved.data.status).toBe("approved");

		const handoff = await getApprovedLeaveHandoff(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-handoff-${suffix}`,
				requestId: approved.data.id,
			},
			ready,
		);
		expect(handoff.ok).toBe(true);
		if (!handoff.ok) return;
		expect(handoff.data).not.toBeNull();
		if (!handoff.data) return;
		expect(handoff.data.employmentId).toBe(employment.data.id);
		expect(handoff.data.policyVersion).toBe(published.data.version);
		expect(handoff.data.quantity).toBe("3");
		expect(handoff.data.segments.length).toBeGreaterThan(0);
	}, 120_000);

	it("rejects overlapping submitted requests parity", async () => {
		const ready = createHrParityHarness(adapter);

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-emp-overlap-${suffix}`,
				idempotencyKey: `idem-emp-overlap-${suffix}`,
				employeeNumber: `E-overlap-${suffix}`,
				legalName: `Overlap Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employ-overlap-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const policy = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-overlap-${suffix}`,
				code: `ANNUAL-OVERLAP-${suffix}`,
				name: "Annual Leave Overlap",
				leaveType: "annual",
				unit: "days",
				paid: true,
				allowsNegativeBalance: false,
				allowSelfApproval: false,
				effectiveFrom: "2025-01-01",
				allowedEmploymentStatuses: ["active"],
			},
			ready,
		);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

		const published = await publishLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-publish-overlap-${suffix}`,
				policyId: policy.data.id,
				expectedVersion: policy.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ent-overlap-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				policyId: published.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: `idem-ent-overlap-${suffix}`,
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) return;

		const first = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-overlap-1-${suffix}`,
				employeeId: employee.data.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-07",
				endDate: "2025-07-09",
				requestedQuantity: "3",
				idempotencyKey: `idem-overlap-1-${suffix}`,
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const firstSubmitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-overlap-submit-1-${suffix}`,
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
				correlationId: `corr-overlap-2-${suffix}`,
				employeeId: employee.data.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-08",
				endDate: "2025-07-10",
				requestedQuantity: "3",
				idempotencyKey: `idem-overlap-2-${suffix}`,
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		const secondSubmitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-overlap-submit-2-${suffix}`,
				requestId: second.data.id,
				expectedVersion: second.data.version,
			},
			ready,
		);
		expect(secondSubmitted.ok).toBe(false);
		expect(humanResourcesCodeFromResult(secondSubmitted)).toBe(
			HUMAN_RESOURCES_ERROR_EFFECTIVE_RANGE_OVERLAP,
		);
	}, 120_000);

	it("rejects overlapping approve when a peer draft exists parity", async () => {
		const ready = createHrParityHarness(adapter);

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-emp-approve-overlap-${suffix}`,
				idempotencyKey: `idem-emp-approve-overlap-${suffix}`,
				employeeNumber: `E-approve-overlap-${suffix}`,
				legalName: `Approve Overlap Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const actorMapped = await mapActorToEmployee(ready.store, {
			organizationId: ORG,
			userId: ACTOR,
			employeeId: employee.data.id,
			actorUserId: ACTOR,
			effectiveFrom: "2025-01-01",
		});
		expect(actorMapped.ok).toBe(true);
		if (!actorMapped.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employ-approve-overlap-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const policy = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approve-overlap-${suffix}`,
				code: `ANNUAL-APPROVE-OVERLAP-${suffix}`,
				name: "Annual Leave Approve Overlap",
				leaveType: "annual",
				unit: "days",
				paid: true,
				allowsNegativeBalance: false,
				allowSelfApproval: false,
				effectiveFrom: "2025-01-01",
				allowedEmploymentStatuses: ["active"],
			},
			ready,
		);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

		const published = await publishLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-publish-approve-overlap-${suffix}`,
				policyId: policy.data.id,
				expectedVersion: policy.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;

		const granted = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ent-approve-overlap-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				policyId: published.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: `idem-ent-approve-overlap-${suffix}`,
			},
			ready,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) return;

		const submittedDraft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-approve-overlap-submit-${suffix}`,
				employeeId: employee.data.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-07",
				endDate: "2025-07-09",
				requestedQuantity: "3",
				idempotencyKey: `idem-approve-overlap-submit-${suffix}`,
			},
			ready,
		);
		expect(submittedDraft.ok).toBe(true);
		if (!submittedDraft.ok) return;

		const submitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-approve-overlap-run-${suffix}`,
				requestId: submittedDraft.data.id,
				expectedVersion: submittedDraft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;

		const overlappingDraft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-approve-overlap-draft-${suffix}`,
				employeeId: employee.data.id,
				entitlementId: granted.data.id,
				startDate: "2025-07-08",
				endDate: "2025-07-10",
				requestedQuantity: "3",
				idempotencyKey: `idem-approve-overlap-draft-${suffix}`,
			},
			ready,
		);
		expect(overlappingDraft.ok).toBe(true);
		if (!overlappingDraft.ok) return;

		const manager = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-mgr-approve-overlap-${suffix}`,
				idempotencyKey: `idem-mgr-approve-overlap-${suffix}`,
				employeeNumber: `MGR-APPROVE-OVERLAP-${suffix}`,
				legalName: `Approve Overlap Manager ${suffix}`,
			},
			ready,
		);
		expect(manager.ok).toBe(true);
		if (!manager.ok) return;

		const managerMapped = await mapActorToEmployee(ready.store, {
			organizationId: ORG,
			userId: MANAGER,
			employeeId: manager.data.id,
			actorUserId: ACTOR,
			effectiveFrom: "2025-01-01",
		});
		expect(managerMapped.ok).toBe(true);
		if (!managerMapped.ok) return;

		const reportingLine = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-line-approve-overlap-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: manager.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(reportingLine.ok).toBe(true);
		if (!reportingLine.ok) return;

		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-approve-overlap-blocked-${suffix}`,
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(false);
		expect(humanResourcesCodeFromResult(approved)).toBe(
			HUMAN_RESOURCES_ERROR_EFFECTIVE_RANGE_OVERLAP,
		);
	}, 120_000);
}

describe("Leave parity (memory)", () => {
	defineLeaveParitySuite("memory");
});

describe.skipIf(!runDrizzleParity)("Leave parity (drizzle)", () => {
	defineLeaveParitySuite("drizzle");
});
