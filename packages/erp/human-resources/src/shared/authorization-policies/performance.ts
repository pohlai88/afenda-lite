import { createScopedPolicy } from "./create-scoped-policy";

export const performancePolicy = createScopedPolicy({
	id: "hr.performance",
	mode: "resource_scoped",
	resourceRequired: true,
	subjectPolicy: "manager_or_privileged",
	fieldClasses: ["employee_relations_evidence"],
	operationPrefixes: [
		"human-resources.performance-cycle.",
		"human-resources.performance-goal.",
		"human-resources.performance-review.",
		"human-resources.improvement-plan.",
		"human-resources.employee-performance-history.",
	],
});
