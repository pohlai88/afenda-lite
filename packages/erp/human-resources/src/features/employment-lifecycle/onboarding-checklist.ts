import type { OnboardingTaskSeed } from "./store-contract";

export const ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS =
	"identity_documents" as const;
export const ONBOARDING_TASK_CODE_WORK_ELIGIBILITY =
	"work_eligibility" as const;
export const ONBOARDING_TASK_CODE_ORIENTATION = "orientation" as const;
export const ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF =
	"equipment_handoff" as const;
export const ONBOARDING_TASK_CODE_ACCESS_HANDOFF = "access_handoff" as const;

export type OnboardingTaskCode =
	| typeof ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS
	| typeof ONBOARDING_TASK_CODE_WORK_ELIGIBILITY
	| typeof ONBOARDING_TASK_CODE_ORIENTATION
	| typeof ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF
	| typeof ONBOARDING_TASK_CODE_ACCESS_HANDOFF;

export const GOVERNED_ONBOARDING_CHECKLIST: readonly OnboardingTaskSeed[] = [
	{
		code: ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
		title: "Identity documents",
		mandatory: true,
	},
	{
		code: ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
		title: "Work eligibility",
		mandatory: true,
	},
	{
		code: ONBOARDING_TASK_CODE_ORIENTATION,
		title: "Orientation",
		mandatory: true,
	},
	{
		code: ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF,
		title: "Equipment handoff",
		mandatory: true,
	},
	{
		code: ONBOARDING_TASK_CODE_ACCESS_HANDOFF,
		title: "Access handoff",
		mandatory: true,
	},
] as const;

const governedByCode = new Map(
	GOVERNED_ONBOARDING_CHECKLIST.map((task) => [task.code, task] as const),
);

export function mergeOnboardingChecklist(
	callerTasks: readonly OnboardingTaskSeed[],
): OnboardingTaskSeed[] {
	const merged = new Map<string, OnboardingTaskSeed>();

	for (const task of GOVERNED_ONBOARDING_CHECKLIST) {
		merged.set(task.code, { ...task });
	}

	for (const task of callerTasks) {
		const code = task.code.trim();
		const governed = governedByCode.get(code);
		if (governed !== undefined) {
			merged.set(code, {
				code: governed.code,
				title: governed.title,
				mandatory: governed.mandatory,
			});
			continue;
		}
		merged.set(code, {
			code,
			title: task.title.trim(),
			mandatory: task.mandatory,
		});
	}

	return Array.from(merged.values());
}
