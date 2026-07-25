import { createScopedPolicy } from "./create-scoped-policy";

export const employeeSubjectPolicy = createScopedPolicy({
	id: "hr.employee-subject",
	mode: "subject_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_or_privileged",
	fieldClasses: ["personal_identifiers"],
	operationPrefixes: [
		"human-resources.person.",
		"human-resources.worker.",
		"human-resources.employee.",
		"human-resources.employment.",
		"human-resources.employment-contract.",
		"human-resources.assignment.",
	],
});
