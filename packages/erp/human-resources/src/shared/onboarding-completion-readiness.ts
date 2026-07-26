import {
	ONBOARDING_TASK_CODE_ACCESS_HANDOFF,
	ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF,
	ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
	ONBOARDING_TASK_CODE_ORIENTATION,
	ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
} from "../lifecycle/onboarding-checklist";
import type { WorkEligibility } from "../types";
import type {
	LifecycleTaskStatus,
	OnboardingAccessHandoffStatus,
	OnboardingEquipmentHandoffStatus,
	OnboardingOrientationStatus,
} from "./lifecycle-status";

export const ONBOARDING_COMPLETION_MISSING_CODES = [
	"mandatory_tasks",
	ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
	ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
	ONBOARDING_TASK_CODE_ORIENTATION,
	ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF,
	ONBOARDING_TASK_CODE_ACCESS_HANDOFF,
] as const;

export type OnboardingCompletionMissingCode =
	(typeof ONBOARDING_COMPLETION_MISSING_CODES)[number];

export type OnboardingCompletionReadiness = {
	ready: boolean;
	missing: OnboardingCompletionMissingCode[];
};

export function evaluateOnboardingCompletionReadiness(input: {
	tasks: readonly {
		code: string;
		mandatory: boolean;
		status: LifecycleTaskStatus;
	}[];
	orientationStatus: OnboardingOrientationStatus | null;
	equipmentHandoffStatus: OnboardingEquipmentHandoffStatus | null;
	accessHandoffStatus: OnboardingAccessHandoffStatus | null;
	missingRequiredDocumentCount: number;
	activeWorkEligibility: WorkEligibility | null;
}): OnboardingCompletionReadiness {
	const missing: OnboardingCompletionMissingCode[] = [];

	const mandatoryTasksComplete = input.tasks.every(
		(task) =>
			!task.mandatory ||
			task.status === "completed" ||
			task.status === "waived",
	);
	if (!mandatoryTasksComplete) {
		missing.push("mandatory_tasks");
	}

	if (input.missingRequiredDocumentCount > 0) {
		missing.push(ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS);
	}

	if (input.activeWorkEligibility === null) {
		missing.push(ONBOARDING_TASK_CODE_WORK_ELIGIBILITY);
	}

	if (input.orientationStatus !== "acknowledged") {
		missing.push(ONBOARDING_TASK_CODE_ORIENTATION);
	}

	if (input.equipmentHandoffStatus !== "handed_over") {
		missing.push(ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF);
	}

	if (input.accessHandoffStatus !== "granted") {
		missing.push(ONBOARDING_TASK_CODE_ACCESS_HANDOFF);
	}

	return {
		ready: missing.length === 0,
		missing,
	};
}
