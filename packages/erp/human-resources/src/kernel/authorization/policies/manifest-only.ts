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
});
