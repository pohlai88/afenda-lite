import { HUMAN_RESOURCES_PERMISSION_PERSON_READ } from "../../../../kernel/authorization/permissions";
import { createScopedPolicy } from "../../../../kernel/authorization/policies/create-scoped-policy";

/** Composite employee profile — subject, direct manager, or HR person read. */
export const employeeProfilePolicy = createScopedPolicy({
	id: "hr.employee-profile",
	mode: "subject_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_manager_or_privileged",
	fieldClasses: [],
	privilegedPermissions: [HUMAN_RESOURCES_PERMISSION_PERSON_READ],
});
