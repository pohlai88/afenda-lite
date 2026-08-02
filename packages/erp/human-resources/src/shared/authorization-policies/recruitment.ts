import { createScopedPolicy } from "./create-scoped-policy";

export const recruitmentPolicy = createScopedPolicy({
	id: "hr.recruitment",
	mode: "privileged_only",
	resourceRequired: false,
	subjectPolicy: "privileged_only",
	fieldClasses: ["background_check", "personal_identifiers"],
});
