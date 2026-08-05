import {
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_MANAGE,
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
} from "../../../kernel/authorization/permissions";
import { createScopedPolicy } from "../../../kernel/authorization/policies/create-scoped-policy";

/**
 * Statutory identifiers (tax file, EPF, SOCSO, SI book) are the most sensitive
 * workforce fields HR holds. There is no subject-self read: the profile is
 * reachable only through the existing sensitive-identifier permissions.
 */
export const statutoryProfilePolicy = createScopedPolicy({
	id: "hr.statutory-profile",
	mode: "privileged_only",
	resourceRequired: false,
	subjectPolicy: "privileged_only",
	fieldClasses: ["personal_identifiers"],
	privilegedPermissions: [
		HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
		HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_MANAGE,
	],
});
