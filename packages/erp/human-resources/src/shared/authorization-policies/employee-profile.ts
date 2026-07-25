import { HUMAN_RESOURCES_PERMISSION_PERSON_READ } from "../../permissions";
import { createScopedPolicy } from "./create-scoped-policy";

/** Composite employee profile — subject, direct manager, or HR person read. */
export const employeeProfilePolicy = createScopedPolicy({
	id: "hr.employee-profile",
	mode: "subject_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_manager_or_privileged",
	fieldClasses: [],
	privilegedPermissions: [HUMAN_RESOURCES_PERMISSION_PERSON_READ],
	operationPrefixes: ["human-resources.employee.profile."],
});
