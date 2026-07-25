import { describe, expect, it } from "vitest";

import type { HumanResourcesEmployeeId, HumanResourcesWorkEligibilityId } from "../src/brands";
import {
	ONBOARDING_TASK_CODE_ACCESS_HANDOFF,
	ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF,
	ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
	ONBOARDING_TASK_CODE_ORIENTATION,
	ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
} from "../src/lifecycle/onboarding-checklist";
import { evaluateOnboardingCompletionReadiness } from "../src/shared/onboarding-completion-readiness";
import type { WorkEligibility } from "../src/types";

const activeWorkEligibility: WorkEligibility = {
	id: "00000000-0000-4000-8000-000000000001" as HumanResourcesWorkEligibilityId,
	organizationId: "org-test",
	employeeId: "00000000-0000-4000-8000-000000000002" as HumanResourcesEmployeeId,
	countryCode: "US",
	jurisdiction: null,
	status: "verified",
	issuedOn: "2025-01-01",
	expiresOn: null,
	verifiedBy: "user-test",
	verifiedAt: new Date("2025-01-02T00:00:00.000Z"),
	documentRef: null,
	version: 1,
	createdBy: "user-test",
	updatedBy: "user-test",
	createdAt: new Date("2025-01-01T00:00:00.000Z"),
	updatedAt: new Date("2025-01-02T00:00:00.000Z"),
};

const completedTasks = [
	{
		code: ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
		mandatory: true,
		status: "completed" as const,
	},
	{
		code: ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
		mandatory: true,
		status: "completed" as const,
	},
	{
		code: ONBOARDING_TASK_CODE_ORIENTATION,
		mandatory: true,
		status: "completed" as const,
	},
	{
		code: ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF,
		mandatory: true,
		status: "completed" as const,
	},
	{
		code: ONBOARDING_TASK_CODE_ACCESS_HANDOFF,
		mandatory: true,
		status: "completed" as const,
	},
];

describe("evaluateOnboardingCompletionReadiness", () => {
	it("returns ready when all completion requirements are satisfied", () => {
		const readiness = evaluateOnboardingCompletionReadiness({
			tasks: completedTasks,
			orientationStatus: "acknowledged",
			equipmentHandoffStatus: "handed_over",
			accessHandoffStatus: "granted",
			missingRequiredDocumentCount: 0,
			activeWorkEligibility,
		});

		expect(readiness).toEqual({ ready: true, missing: [] });
	});

	it("reports each missing completion requirement", () => {
		const readiness = evaluateOnboardingCompletionReadiness({
			tasks: [
				{
					code: ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
					mandatory: true,
					status: "pending",
				},
			],
			orientationStatus: "pending",
			equipmentHandoffStatus: "pending",
			accessHandoffStatus: "pending",
			missingRequiredDocumentCount: 2,
			activeWorkEligibility: null,
		});

		expect(readiness.ready).toBe(false);
		expect(readiness.missing).toEqual([
			"mandatory_tasks",
			ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
			ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
			ONBOARDING_TASK_CODE_ORIENTATION,
			ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF,
			ONBOARDING_TASK_CODE_ACCESS_HANDOFF,
		]);
	});

	it("treats waived mandatory tasks as complete", () => {
		const readiness = evaluateOnboardingCompletionReadiness({
			tasks: completedTasks.map((task) =>
				task.code === ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS
					? { ...task, status: "waived" as const }
					: task,
			),
			orientationStatus: "acknowledged",
			equipmentHandoffStatus: "handed_over",
			accessHandoffStatus: "granted",
			missingRequiredDocumentCount: 0,
			activeWorkEligibility,
		});

		expect(readiness).toEqual({ ready: true, missing: [] });
	});
});
