import { createScopedPolicy } from "../../../kernel/authorization/policies/create-scoped-policy";

export const organizationPolicy = createScopedPolicy({
	id: "hr.organization",
	mode: "manifest_only",
	resourceRequired: false,
	subjectPolicy: "manifest_only",
});
