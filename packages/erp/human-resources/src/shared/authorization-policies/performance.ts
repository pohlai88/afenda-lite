import { createScopedPolicy } from "./create-scoped-policy";

export const performancePolicy = createScopedPolicy({
	id: "hr.performance",
	mode: "resource_scoped",
	resourceRequired: true,
	subjectPolicy: "manager_or_privileged",
	fieldClasses: ["employee_relations_evidence"],
});
