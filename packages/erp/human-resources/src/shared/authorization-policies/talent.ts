import {
	HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN,
	HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
	HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
} from "../../permissions";
import { createScopedPolicy } from "./create-scoped-policy";

/** Competency assessments — subject, manager (direct/governed), or privileged. */
export const talentAssessmentPolicy = createScopedPolicy({
	id: "hr.talent-assessment",
	mode: "subject_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_manager_or_privileged",
	fieldClasses: ["succession"],
	privilegedPermissions: [HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN],
	operationPrefixes: [
		"human-resources.competency-assessment.",
		"human-resources.employee-competency-profile.",
	],
});

/**
 * Own talent profile / pool / career plan — subject or manager scope;
 * talent administrator via privilegedActor or talent.admin permission.
 */
export const talentProfilePolicy = createScopedPolicy({
	id: "hr.talent-profile",
	mode: "subject_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_manager_or_privileged",
	fieldClasses: ["succession"],
	privilegedPermissions: [HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN],
	operationPrefixes: [
		"human-resources.talent-profile.",
		"human-resources.talent-profile-assessment.",
		"human-resources.talent-profile-mobility.",
		"human-resources.critical-role-readiness.",
		"human-resources.talent-pool.",
		"human-resources.talent-pool-member.",
		"human-resources.career-plan.",
		"human-resources.career-plan-action.",
	],
});

/** Succession information — privileged only. */
export const successionPolicy = createScopedPolicy({
	id: "hr.succession",
	mode: "privileged_only",
	resourceRequired: false,
	subjectPolicy: "privileged_only",
	fieldClasses: ["succession"],
	privilegedPermissions: [
		HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN,
		HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
		HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
	],
	operationPrefixes: [
		"human-resources.succession-plan.",
		"human-resources.succession-candidate.",
		"human-resources.position-succession-coverage.",
	],
});
