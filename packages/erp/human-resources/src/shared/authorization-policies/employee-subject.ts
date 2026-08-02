import { createScopedPolicy } from "./create-scoped-policy";

export const employeeSubjectPolicy = createScopedPolicy({
	id: "hr.employee-subject",
	mode: "subject_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_or_privileged",
	fieldClasses: ["personal_identifiers"],
});
