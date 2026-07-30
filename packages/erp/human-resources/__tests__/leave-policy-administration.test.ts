/**
 * Slice 7.1 — Leave policy administration checklist.
 */

import { describe, expect, it } from "vitest";
import type { HumanResourcesPermission } from "../src/authorization";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { suspendEmployment } from "../src/core/employment-management";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
} from "../src/error-codes";
import {
	archiveLeavePolicy,
	createLeavePolicy,
	getLeavePolicy,
	publishLeavePolicy,
	resolveApplicableLeavePolicy,
	supersedeLeavePolicy,
	updateLeavePolicy,
} from "../src/leave/leave-policy";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { helperAssert as assert } from "./helpers/helper-assert";
import {
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG = "org-leave-policy-admin";
const ACTOR = "user-leave-policy-admin";

const POLICY_ADMIN_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
] as const satisfies readonly HumanResourcesPermission[];

function harness() {
	const store = createMemoryHumanResourcesStore();
	return createTestHumanResourcesCommandOptions({
		store,
		ports: createMemoryMutationPorts(),
		authorization: createGrantingHumanResourcesAuthorization(
			POLICY_ADMIN_PERMISSIONS,
		),
		identityResolver: createStoreBackedIdentityResolver(store),
	});
}

const FULL_BALANCE_RULES = {
	accrualBasis: "periodic" as const,
	accrualFrequency: "monthly" as const,
	accrualQuantityPerPeriod: "1.5",
	carryForwardEnabled: true,
	carryForwardMaxQuantity: "5",
	entitlementExpiryRule: "days_after_period_end" as const,
	entitlementExpiryDays: 30,
};

async function seedWorker(ready: ReturnType<typeof harness>) {
	const employee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-policy-admin-emp",
			idempotencyKey: "idem-policy-admin-emp",
			employeeNumber: "E-POLICY-ADMIN",
			legalName: "Policy Admin Worker",
		},
		ready,
	);
	assert.strictEqual(employee.ok, true);
	if (!employee.ok) {
		return null;
	}

	await mapActorToEmployee(ready.store, {
		organizationId: ORG,
		userId: ACTOR,
		employeeId: employee.data.id,
		actorUserId: ACTOR,
		effectiveFrom: "2025-01-01",
	});

	const employment = await createEmployment(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-policy-admin-employ",
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		ready,
	);
	assert.strictEqual(employment.ok, true);
	if (!employment.ok) {
		return null;
	}

	return { employee: employee.data, employment: employment.data };
}

describe("Slice 7.1 — Leave policy administration", () => {
	it("persists balance-rule configuration on create and get", async () => {
		const ready = harness();
		const created = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-config-create",
				code: "CONFIG",
				name: "Configured Leave",
				leaveType: "annual",
				unit: "days",
				paid: true,
				allowsNegativeBalance: true,
				effectiveFrom: "2025-01-01",
				allowedEmploymentStatuses: ["active"],
				...FULL_BALANCE_RULES,
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.allowsNegativeBalance).toBe(true);
		expect(created.data.accrualBasis).toBe("periodic");
		expect(created.data.carryForwardEnabled).toBe(true);
		expect(created.data.entitlementExpiryRule).toBe("days_after_period_end");
		expect(created.data.entitlementExpiryDays).toBe(30);

		const loaded = await getLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-config-get",
				policyId: created.data.id,
			},
			ready,
		);
		expect(loaded.ok).toBe(true);
		if (!loaded.ok || loaded.data === null) {
			return;
		}
		expect(loaded.data.accrualQuantityPerPeriod).toBe("1.5");
		expect(loaded.data.carryForwardMaxQuantity).toBe("5");
	});

	it("rejects invalid balance-rule combinations at the command boundary", async () => {
		const ready = harness();
		const invalid = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-config-invalid",
				code: "INVALID",
				name: "Invalid Leave",
				leaveType: "annual",
				unit: "days",
				paid: true,
				effectiveFrom: "2025-01-01",
				allowedEmploymentStatuses: ["active"],
				accrualBasis: "none",
				accrualFrequency: "monthly",
			},
			ready,
		);
		expect(invalid.ok).toBe(false);
		expect(humanResourcesCodeFromResult(invalid)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("updates draft-only policy fields including balance rules", async () => {
		const ready = harness();
		const created = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-draft-create",
				code: "DRAFT",
				name: "Draft Leave",
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

		const updated = await updateLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-draft-update",
				policyId: created.data.id,
				expectedVersion: created.data.version,
				...FULL_BALANCE_RULES,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}
		expect(updated.data.accrualBasis).toBe("periodic");
		expect(updated.data.carryForwardMaxQuantity).toBe("5");
	});

	it("enforces publish and archive guards on draft-only edits", async () => {
		const ready = harness();
		const created = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-guards-create",
				code: "GUARDS",
				name: "Guarded Leave",
				leaveType: "annual",
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

		const published = await publishLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-guards-publish",
				policyId: created.data.id,
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}

		const updateAfterPublish = await updateLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-guards-update-published",
				policyId: published.data.id,
				expectedVersion: published.data.version,
				name: "Should Fail",
			},
			ready,
		);
		expect(updateAfterPublish.ok).toBe(false);
		expect(humanResourcesCodeFromResult(updateAfterPublish)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);

		const archived = await archiveLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-guards-archive",
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

		const updateAfterArchive = await updateLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-guards-update-archived",
				policyId: archived.data.id,
				expectedVersion: archived.data.version,
				name: "Still Fail",
			},
			ready,
		);
		expect(updateAfterArchive.ok).toBe(false);
	});

	it("supersedes policy lineage and resolves historical as-of dates", async () => {
		const ready = harness();
		const worker = await seedWorker(ready);
		if (worker === null) {
			return;
		}

		const v1Created = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-v1-create",
				code: "ANNUAL",
				name: "Annual v1",
				leaveType: "annual",
				unit: "days",
				paid: true,
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-06-30",
				minTenureDays: 0,
				allowedEmploymentStatuses: ["active"],
			},
			ready,
		);
		expect(v1Created.ok).toBe(true);
		if (!v1Created.ok) {
			return;
		}

		const v1Published = await publishLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-v1-publish",
				policyId: v1Created.data.id,
				expectedVersion: v1Created.data.version,
			},
			ready,
		);
		expect(v1Published.ok).toBe(true);
		if (!v1Published.ok) {
			return;
		}

		const v2 = await supersedeLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-v2-supersede",
				policyId: v1Published.data.id,
				expectedVersion: v1Published.data.version,
				code: "ANNUAL",
				name: "Annual v2",
				leaveType: "annual",
				unit: "days",
				paid: true,
				effectiveFrom: "2025-07-01",
				minTenureDays: 0,
				allowedEmploymentStatuses: ["active"],
				...FULL_BALANCE_RULES,
			},
			ready,
		);
		expect(v2.ok).toBe(true);
		if (!v2.ok) {
			return;
		}
		expect(v2.data.status).toBe("published");
		expect(v2.data.supersedesPolicyId).toBe(v1Published.data.id);
		expect(v2.data.accrualBasis).toBe("periodic");

		const v1Loaded = await getLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-v1-get",
				policyId: v1Published.data.id,
			},
			ready,
		);
		expect(v1Loaded.ok).toBe(true);
		if (!v1Loaded.ok || v1Loaded.data === null) {
			return;
		}
		expect(v1Loaded.data.status).toBe("superseded");

		const beforeCutover = await resolveApplicableLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-resolve-before",
				policyCode: "ANNUAL",
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				asOfDate: "2025-03-01",
			},
			ready,
		);
		expect(beforeCutover.ok).toBe(true);
		if (!beforeCutover.ok) {
			return;
		}
		expect(beforeCutover.data?.policy.id).toBe(v1Published.data.id);

		const afterCutover = await resolveApplicableLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-resolve-after",
				policyCode: "ANNUAL",
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				asOfDate: "2025-08-01",
			},
			ready,
		);
		expect(afterCutover.ok).toBe(true);
		if (!afterCutover.ok) {
			return;
		}
		expect(afterCutover.data?.policy.id).toBe(v2.data.id);
	});

	it("returns null when eligibility tenure or status does not match", async () => {
		const ready = harness();
		const worker = await seedWorker(ready);
		if (worker === null) {
			return;
		}

		const created = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-eligibility-create",
				code: "TENURE",
				name: "Tenure Gate",
				leaveType: "annual",
				unit: "days",
				paid: true,
				effectiveFrom: "2025-01-01",
				minTenureDays: 90,
				allowedEmploymentStatuses: ["active"],
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const published = await publishLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-eligibility-publish",
				policyId: created.data.id,
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}

		const tooEarly = await resolveApplicableLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-eligibility-early",
				policyCode: "TENURE",
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				asOfDate: "2025-02-01",
			},
			ready,
		);
		expect(tooEarly.ok).toBe(true);
		if (!tooEarly.ok) {
			return;
		}
		expect(tooEarly.data).toBeNull();

		const eligible = await resolveApplicableLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-eligibility-ok",
				policyCode: "TENURE",
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				asOfDate: "2025-06-01",
			},
			ready,
		);
		expect(eligible.ok).toBe(true);
		if (!eligible.ok) {
			return;
		}
		expect(eligible.data?.policy.id).toBe(published.data.id);

		const suspended = await suspendEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-eligibility-suspend",
				employmentId: worker.employment.id,
				effectiveOn: "2025-06-01",
				expectedVersion: worker.employment.version,
			},
			ready,
		);
		expect(suspended.ok).toBe(true);
		if (!suspended.ok) {
			return;
		}
		expect(suspended.data.status).toBe("notice");

		const statusMismatch = await resolveApplicableLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-policy-eligibility-status",
				policyCode: "TENURE",
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				asOfDate: "2025-06-01",
			},
			ready,
		);
		expect(statusMismatch.ok).toBe(true);
		if (!statusMismatch.ok) {
			return;
		}
		expect(statusMismatch.data).toBeNull();
	});
});
