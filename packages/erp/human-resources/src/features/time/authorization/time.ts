import { createScopedPolicy } from "../../../kernel/authorization/policies/create-scoped-policy";

export const timePolicy = createScopedPolicy({
	id: "hr.time",
	mode: "resource_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_or_privileged",
});
