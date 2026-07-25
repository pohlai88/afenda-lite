import { createScopedPolicy } from "./create-scoped-policy";

/**
 * Manifest-only definitions and structure. Competency *assessment* ops use
 * explicit non-prefix-colliding IDs so they do not steal competency-assessment.*.
 */
export const manifestOnlyPolicy = createScopedPolicy({
	id: "hr.manifest-only",
	mode: "manifest_only",
	resourceRequired: false,
	subjectPolicy: "manifest_only",
	operationPrefixes: [
		"human-resources.department.",
		"human-resources.job.",
		"human-resources.position.",
		"human-resources.work-calendar.",
		"human-resources.job-competency.",
		// Explicit competency definition ops (avoid prefix clash with competency-assessment.)
		"human-resources.competency.create",
		"human-resources.competency.update",
		"human-resources.competency.retire",
		"human-resources.competency.get",
		"human-resources.competency.list",
	],
});
