import { createScopedPolicy } from "../../../kernel/authorization/policies/create-scoped-policy";

export const leavePolicy = createScopedPolicy({
	id: "hr.leave",
	mode: "subject_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_or_privileged",
	fieldClasses: ["medical"],
});
