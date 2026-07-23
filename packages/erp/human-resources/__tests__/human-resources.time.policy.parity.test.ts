import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../src/error-codes";
import {
	activateTimePolicy,
	assignTimePolicy,
	createTimePolicy,
	resolveTimePolicy,
	supersedeTimePolicy,
} from "../src/time/policy";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { runDrizzleParity, uniqueSuffix } from "./helpers/time-parity-shared";

function defineTimePolicyParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-time-parity-${suffix}`;
	const ACTOR = `user-hr-time-parity-${suffix}`;
	const _MANAGER = `user-hr-time-mgr-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("effective-dated time policy successor parity", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-employee-${suffix}`,
				idempotencyKey: `idem-policy-successor-employee-${suffix}`,
				employeeNumber: `EPS-${suffix}`,
				legalName: `Policy Successor Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;
		const policy = await createTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-create-${suffix}`,
				idempotencyKey: `idem-policy-successor-create-${suffix}`,
				code: `POLICY-SUCCESSOR-${suffix}`,
				name: "Policy v1",
				effectiveFrom: "2025-01-01",
				minimumRestMinutes: 660,
				automaticBreakAfterMinutes: 300,
				automaticBreakMinutes: 60,
				approvalSteps: ["line_manager", "hr"],
			},
			ready,
		);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;
		const activePolicy = await activateTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-activate-${suffix}`,
				policyId: policy.data.id,
				expectedVersion: policy.data.version,
			},
			ready,
		);
		expect(activePolicy.ok).toBe(true);
		if (!activePolicy.ok) return;
		const policyAssignment = await assignTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-assign-${suffix}`,
				policyId: activePolicy.data.id,
				employmentId: employment.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(policyAssignment.ok).toBe(true);
		const overlappingPolicyAssignment = await assignTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-overlap-${suffix}`,
				policyId: activePolicy.data.id,
				employmentId: employment.data.id,
				effectiveFrom: "2025-06-01",
			},
			ready,
		);
		expect(overlappingPolicyAssignment.ok).toBe(false);
		if (!overlappingPolicyAssignment.ok) {
			expect(humanResourcesCodeFromResult(overlappingPolicyAssignment)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
		const successor = await supersedeTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-supersede-${suffix}`,
				idempotencyKey: `idem-policy-successor-supersede-${suffix}`,
				policyId: activePolicy.data.id,
				expectedVersion: activePolicy.data.version,
				name: "Policy v2",
				effectiveFrom: "2025-08-01",
				minimumRestMinutes: 720,
				automaticBreakAfterMinutes: 300,
				automaticBreakMinutes: 45,
				approvalSteps: ["line_manager", "hr"],
			},
			ready,
		);
		expect(successor.ok).toBe(true);
		if (!successor.ok) return;
		expect(successor.data.superseded).toMatchObject({
			id: activePolicy.data.id,
			status: "superseded",
			effectiveTo: "2025-07-31",
		});
		expect(successor.data.successor).toMatchObject({
			status: "active",
			supersedesPolicyId: activePolicy.data.id,
			effectiveFrom: "2025-08-01",
		});
		const historicalPolicy = await resolveTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-historical-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2025-07-31",
			},
			ready,
		);
		expect(historicalPolicy.ok).toBe(true);
		if (!historicalPolicy.ok) return;
		expect(historicalPolicy.data?.id).toBe(activePolicy.data.id);
		const futurePolicy = await resolveTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-future-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2025-08-01",
			},
			ready,
		);
		expect(futurePolicy.ok).toBe(true);
		if (!futurePolicy.ok) return;
		expect(futurePolicy.data?.id).toBe(successor.data.successor.id);
		const unrelatedPolicy = await createTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-unrelated-${suffix}`,
				idempotencyKey: `idem-policy-successor-unrelated-${suffix}`,
				code: policy.data.code,
				name: "Unrelated same-code policy",
				effectiveFrom: "2025-09-01",
				minimumRestMinutes: 480,
				automaticBreakMinutes: 0,
				approvalSteps: ["payroll"],
			},
			ready,
		);
		expect(unrelatedPolicy.ok).toBe(true);
		if (!unrelatedPolicy.ok) return;
		const activeUnrelatedPolicy = await activateTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-unrelated-activate-${suffix}`,
				policyId: unrelatedPolicy.data.id,
				expectedVersion: unrelatedPolicy.data.version,
			},
			ready,
		);
		expect(activeUnrelatedPolicy.ok).toBe(true);
		const isolatedPolicy = await resolveTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-isolated-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2025-10-01",
			},
			ready,
		);
		expect(isolatedPolicy.ok).toBe(true);
		if (!isolatedPolicy.ok) return;
		expect(isolatedPolicy.data?.id).toBe(successor.data.successor.id);
	});
}

describe("human-resources.time.policy.parity (memory)", () => {
	defineTimePolicyParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"human-resources.time.policy.parity (drizzle)",
	() => {
		defineTimePolicyParitySuite("drizzle");
	},
);
