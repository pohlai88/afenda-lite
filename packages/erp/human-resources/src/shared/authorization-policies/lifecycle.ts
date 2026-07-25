import { createScopedPolicy } from "./create-scoped-policy";

export const lifecyclePolicy = createScopedPolicy({
	id: "hr.lifecycle",
	mode: "resource_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_or_privileged",
	operationPrefixes: [
		"human-resources.onboarding.",
		"human-resources.onboarding-case.",
		"human-resources.onboarding-tasks.",
		"human-resources.onboarding-orientation.",
		"human-resources.onboarding-equipment-handoff.",
		"human-resources.onboarding-access-handoff.",
		"human-resources.probation.",
		"human-resources.probation-review.",
		"human-resources.probation-reviews.",
		"human-resources.probation-assessments.",
		"human-resources.employment-confirmation.",
		"human-resources.termination.",
		"human-resources.offboarding.",
		"human-resources.offboarding-case.",
		"human-resources.offboarding-tasks.",
		"human-resources.offboarding-access-revocation.",
		"human-resources.offboarding-payroll-handoff.",
		"human-resources.clearance.",
	],
});
