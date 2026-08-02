import { createScopedPolicy } from "../../../kernel/authorization/policies/create-scoped-policy";

export const lifecyclePolicy = createScopedPolicy({
	id: "hr.lifecycle",
	mode: "resource_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_or_privileged",
});
