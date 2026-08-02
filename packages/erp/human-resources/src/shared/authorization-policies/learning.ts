import { createScopedPolicy } from "./create-scoped-policy";

export const learningPolicy = createScopedPolicy({
	id: "hr.learning",
	mode: "resource_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_or_privileged",
});
