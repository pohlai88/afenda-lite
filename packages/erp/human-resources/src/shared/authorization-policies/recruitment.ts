import { createScopedPolicy } from "./create-scoped-policy";

export const recruitmentPolicy = createScopedPolicy({
	id: "hr.recruitment",
	mode: "privileged_only",
	resourceRequired: false,
	subjectPolicy: "privileged_only",
	fieldClasses: ["background_check", "personal_identifiers"],
	operationPrefixes: [
		"human-resources.requisition.",
		"human-resources.candidate.",
		"human-resources.application.",
		"human-resources.interview.",
		"human-resources.interview-evaluation.",
		"human-resources.offer.",
		"human-resources.hire.",
		"human-resources.recruitment.",
	],
});
