import { createScopedPolicy } from "./create-scoped-policy";

export const leavePolicy = createScopedPolicy({
	id: "hr.leave",
	mode: "subject_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_or_privileged",
	fieldClasses: ["medical"],
	operationPrefixes: [
		"human-resources.leave-policy.",
		"human-resources.leave-entitlement.",
		"human-resources.leave-balance.",
		"human-resources.leave-request.",
		"human-resources.approved-leave-handoff.",
	],
});
