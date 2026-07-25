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
		"human-resources.probation.",
		"human-resources.probation-review.",
		"human-resources.employment-confirmation.",
		"human-resources.termination.",
		"human-resources.offboarding.",
		"human-resources.offboarding-case.",
		"human-resources.offboarding-tasks.",
		"human-resources.clearance.",
	],
});
