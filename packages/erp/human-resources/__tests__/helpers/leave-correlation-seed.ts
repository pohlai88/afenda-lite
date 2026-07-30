import type { HumanResourcesCommandOptions } from "../../src/command-options";
import { createEmployee } from "../../src/core/employee";
import { createEmployment } from "../../src/core/employment";
import { grantLeaveEntitlement } from "../../src/leave/entitlement";
import {
	createLeavePolicy,
	publishLeavePolicy,
} from "../../src/leave/leave-policy";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
} from "../../src/permissions";
import { helperAssert as assert } from "./helper-assert";
import { mapActorToEmployee } from "./identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./memory-authorization";

export async function seedLeaveCorrelationFixture(input: {
	organizationId: string;
	actorUserId: string;
	ready: HumanResourcesCommandOptions & {
		store: NonNullable<HumanResourcesCommandOptions["store"]>;
	};
	suffix?: string;
}) {
	const suffix = input.suffix ?? "a";
	const seedReady = {
		...input.ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
			HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
			HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
		]),
	};

	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-leave-corr-emp-${suffix}`,
			idempotencyKey: `idem-leave-corr-emp-${suffix}`,
			employeeNumber: `E-LEAVE-CORR-${suffix}`,
			legalName: "Leave Correlation Worker",
		},
		seedReady,
	);
	assert.strictEqual(employee.ok, true);
	if (!employee.ok) {
		throw employee.error;
	}

	await mapActorToEmployee(input.ready.store, {
		organizationId: input.organizationId,
		userId: input.actorUserId,
		employeeId: employee.data.id,
		actorUserId: input.actorUserId,
		effectiveFrom: "2025-01-01",
	});

	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: "corr-leave-corr-employ",
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		seedReady,
	);
	assert.strictEqual(employment.ok, true);
	if (!employment.ok) {
		throw employment.error;
	}

	const policy = await createLeavePolicy(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: "corr-leave-corr-policy",
			code: `ANNUAL-CORR-${suffix}`,
			name: "Annual Correlation Leave",
			leaveType: "annual",
			unit: "days",
			paid: true,
			allowsNegativeBalance: false,
			allowSelfApproval: false,
			effectiveFrom: "2025-01-01",
			allowedEmploymentStatuses: ["active"],
		},
		seedReady,
	);
	assert.strictEqual(policy.ok, true);
	if (!policy.ok) {
		throw policy.error;
	}

	const published = await publishLeavePolicy(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: "corr-leave-corr-policy-publish",
			policyId: policy.data.id,
			expectedVersion: policy.data.version,
		},
		seedReady,
	);
	assert.strictEqual(published.ok, true);
	if (!published.ok) {
		throw published.error;
	}

	const entitlement = await grantLeaveEntitlement(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: "corr-leave-corr-entitlement",
			idempotencyKey: `idem-leave-corr-entitlement-${suffix}`,
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			policyId: published.data.id,
			periodStart: "2025-01-01",
			periodEnd: "2025-12-31",
			openingQuantity: "10",
		},
		seedReady,
	);
	assert.strictEqual(entitlement.ok, true);
	if (!entitlement.ok) {
		throw entitlement.error;
	}

	return {
		employee: employee.data,
		employment: employment.data,
		policy: published.data,
		entitlement: entitlement.data,
		seedReady,
	};
}
