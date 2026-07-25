import { createScopedPolicy } from "./create-scoped-policy";

export const organizationPolicy = createScopedPolicy({
	id: "hr.organization",
	mode: "manifest_only",
	resourceRequired: false,
	subjectPolicy: "manifest_only",
	operationPrefixes: [
		"human-resources.organization.",
		"human-resources.reporting-line.",
	],
});
