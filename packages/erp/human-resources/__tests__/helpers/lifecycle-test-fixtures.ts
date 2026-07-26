import { expect } from "vitest";

import type { HumanResourcesEmploymentId } from "../../src/brands";
import type { HumanResourcesCommandOptions } from "../../src/command-options";
import {
	recordWorkEligibility,
	verifyWorkEligibility,
} from "../../src/compliance/work-eligibility";
import {
	completeOnboarding,
	completeOnboardingTask,
	getOnboardingAccessHandoffByCase,
	getOnboardingCase,
	getOnboardingEquipmentHandoffByCase,
	getOnboardingOrientationByCase,
	listOnboardingTasks,
	recordOnboardingAccessHandoff,
	recordOnboardingEquipmentHandoff,
	recordOnboardingOrientation,
	startOnboarding,
} from "../../src/lifecycle/onboarding";
import {
	GOVERNED_ONBOARDING_CHECKLIST,
	ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
	ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
} from "../../src/lifecycle/onboarding-checklist";
import {
	approveTermination,
	finalizeTermination,
	proposeTermination,
} from "../../src/lifecycle/termination";
import type { OnboardingCase, Termination } from "../../src/types";

type LifecycleTestReady = HumanResourcesCommandOptions & {
	store: NonNullable<HumanResourcesCommandOptions["store"]>;
};

type TerminationFlowFailure = { ok: false; code: string; message: string };

export async function runEmploymentTerminationFlow(
	ready: LifecycleTestReady,
	input: {
		organizationId: string;
		actorUserId: string;
		employmentId: HumanResourcesEmploymentId;
		correlationId: string;
		idempotencyKey: string;
		reasonCode: string;
		reasonDetail: string;
		effectiveOn: string;
		rehireEligible?: boolean;
	},
): Promise<
	| {
			ok: true;
			proposed: Termination;
			approved: Termination;
			termination: Termination;
	  }
	| TerminationFlowFailure
> {
	const proposed = await proposeTermination(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationId}-propose`,
			idempotencyKey: input.idempotencyKey,
			employmentId: input.employmentId,
			reasonCode: input.reasonCode,
			reasonDetail: input.reasonDetail,
			effectiveOn: input.effectiveOn,
			rehireEligible: input.rehireEligible ?? true,
		},
		ready,
	);
	if (!proposed.ok) {
		return proposed;
	}

	const approved = await approveTermination(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationId}-approve`,
			terminationId: proposed.data.id,
			expectedVersion: proposed.data.version,
		},
		ready,
	);
	if (!approved.ok) {
		return approved;
	}

	const termination = await finalizeTermination(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			terminationId: approved.data.id,
			expectedVersion: approved.data.version,
		},
		ready,
	);
	if (!termination.ok) {
		return termination;
	}

	return {
		ok: true,
		proposed: proposed.data,
		approved: approved.data,
		termination: termination.data,
	};
}

export async function finalizeEmploymentTermination(
	ready: LifecycleTestReady,
	input: Parameters<typeof runEmploymentTerminationFlow>[1],
): Promise<{ ok: true; data: Termination } | TerminationFlowFailure> {
	const flow = await runEmploymentTerminationFlow(ready, input);
	if (!flow.ok) {
		return flow;
	}
	return { ok: true, data: flow.termination };
}

async function seedOnboardingWorkEligibility(
	ready: LifecycleTestReady,
	input: {
		organizationId: string;
		actorUserId: string;
		employeeId: string;
		suffix: string;
	},
) {
	const recorded = await recordWorkEligibility(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-eligibility-${input.suffix}`,
			employeeId: input.employeeId,
			countryCode: "US",
			issuedOn: "2025-01-01",
			idempotencyKey: `idem-onb-eligibility-${input.suffix}`,
		},
		ready,
	);
	if (!recorded.ok) return recorded;

	return verifyWorkEligibility(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-eligibility-verify-${input.suffix}`,
			eligibilityId: recorded.data.id,
			evidenceDate: "2025-01-02",
			expectedVersion: recorded.data.version,
		},
		ready,
	);
}

async function completeOnboardingTaskByCode(
	ready: LifecycleTestReady,
	input: {
		organizationId: string;
		actorUserId: string;
		onboardingCaseId: string;
		code: string;
		suffix: string;
	},
) {
	const tasks = await listOnboardingTasks(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-task-list-${input.suffix}-${input.code}`,
			onboardingCaseId: input.onboardingCaseId,
		},
		ready,
	);
	if (!tasks.ok) return tasks;
	const task = tasks.data.find((row) => row.code === input.code);
	if (task === undefined) {
		throw new Error(`Expected onboarding task ${input.code}`);
	}
	return completeOnboardingTask(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-task-${input.suffix}-${input.code}`,
			taskId: task.id,
			status: "completed",
			expectedVersion: task.version,
		},
		ready,
	);
}

export async function completeOnboardingPath(
	ready: LifecycleTestReady,
	input: {
		organizationId: string;
		actorUserId: string;
		employmentId: string;
		employeeId: string;
		suffix: string;
		sourceOfferId?: string | null;
		onboardingCaseId?: string;
	},
) {
	let onboardingCase: OnboardingCase;
	if (input.onboardingCaseId !== undefined) {
		const existing = await getOnboardingCase(
			{
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: `corr-onb-get-${input.suffix}`,
				onboardingCaseId: input.onboardingCaseId,
			},
			ready,
		);
		if (!existing.ok) return existing;
		if (existing.data === null) {
			throw new Error("Expected onboarding case");
		}
		onboardingCase = existing.data;
	} else {
		const started = await startOnboarding(
			{
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: `corr-onb-start-${input.suffix}`,
				idempotencyKey: `idem-onb-${input.suffix}`,
				employmentId: input.employmentId,
				sourceOfferId: input.sourceOfferId,
				tasks: [
					{
						code: ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
						title: "Identity documents",
						mandatory: true,
					},
				],
			},
			ready,
		);
		if (!started.ok) return started;
		onboardingCase = started.data;
	}

	const tasks = await listOnboardingTasks(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-tasks-${input.suffix}`,
			onboardingCaseId: onboardingCase.id,
		},
		ready,
	);
	if (!tasks.ok) return tasks;
	expect(tasks.data.map((row) => row.code).toSorted()).toEqual(
		GOVERNED_ONBOARDING_CHECKLIST.map((row) => row.code).toSorted(),
	);

	const eligibility = await seedOnboardingWorkEligibility(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		employeeId: input.employeeId,
		suffix: input.suffix,
	});
	if (!eligibility.ok) {
		return {
			ok: false as const,
			code: eligibility.code,
			message: `seedOnboardingWorkEligibility: ${eligibility.message}`,
		};
	}

	let activeCase = onboardingCase;

	const identityDone = await completeOnboardingTaskByCode(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		onboardingCaseId: activeCase.id,
		code: ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
		suffix: input.suffix,
	});
	if (!identityDone.ok) return identityDone;
	activeCase = identityDone.data;

	const eligibilityDone = await completeOnboardingTaskByCode(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		onboardingCaseId: activeCase.id,
		code: ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
		suffix: input.suffix,
	});
	if (!eligibilityDone.ok) return eligibilityDone;
	activeCase = eligibilityDone.data;

	const orientation = await getOnboardingOrientationByCase(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-orientation-get-${input.suffix}`,
			onboardingCaseId: activeCase.id,
		},
		ready,
	);
	if (!orientation.ok) return orientation;
	if (orientation.data === null) {
		throw new Error("Expected onboarding orientation");
	}
	const orientationRecorded = await recordOnboardingOrientation(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-orientation-${input.suffix}`,
			orientationId: orientation.data.id,
			acknowledgedOn: "2025-01-15",
			expectedVersion: orientation.data.version,
		},
		ready,
	);
	if (!orientationRecorded.ok) return orientationRecorded;
	activeCase = orientationRecorded.data;

	const equipment = await getOnboardingEquipmentHandoffByCase(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-equipment-get-${input.suffix}`,
			onboardingCaseId: activeCase.id,
		},
		ready,
	);
	if (!equipment.ok) return equipment;
	if (equipment.data === null) {
		throw new Error("Expected onboarding equipment handoff");
	}
	const equipmentRecorded = await recordOnboardingEquipmentHandoff(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-equipment-${input.suffix}`,
			equipmentHandoffId: equipment.data.id,
			handedOverOn: "2025-01-16",
			summary: "Equipment issued",
			expectedVersion: equipment.data.version,
		},
		ready,
	);
	if (!equipmentRecorded.ok) return equipmentRecorded;
	activeCase = equipmentRecorded.data;

	const access = await getOnboardingAccessHandoffByCase(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-access-get-${input.suffix}`,
			onboardingCaseId: activeCase.id,
		},
		ready,
	);
	if (!access.ok) return access;
	if (access.data === null) {
		throw new Error("Expected onboarding access handoff");
	}
	const accessRecorded = await recordOnboardingAccessHandoff(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-access-${input.suffix}`,
			accessHandoffId: access.data.id,
			grantedOn: "2025-01-17",
			summary: "Access granted",
			expectedVersion: access.data.version,
		},
		ready,
	);
	if (!accessRecorded.ok) return accessRecorded;
	activeCase = accessRecorded.data;

	return completeOnboarding(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-onb-complete-${input.suffix}`,
			onboardingCaseId: activeCase.id,
			expectedVersion: activeCase.version,
		},
		ready,
	);
}
