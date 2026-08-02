import {
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
} from "../authorization/authorization-policy-ids";
import type { HumanResourcesOperationSensitivity } from "../privacy/sensitivity-types";

const defineSensitivity = <const T extends HumanResourcesOperationSensitivity>(
	definition: T,
): Readonly<T> => Object.freeze(definition);

export const HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY =
	defineSensitivity({
		resourceType: "personal_identifiers",
		subjectPolicy: "subject_or_privileged",
		fieldClasses: ["personal_identifiers"],
	});

export const HUMAN_RESOURCES_BACKGROUND_CHECK_SENSITIVITY = defineSensitivity({
	resourceType: "background_check",
	subjectPolicy: "privileged_only",
	fieldClasses: ["background_check", "personal_identifiers"],
});

export const HUMAN_RESOURCES_BENEFITS_SENSITIVITY = defineSensitivity({
	resourceType: "benefits",
	subjectPolicy: "subject_or_privileged",
	fieldClasses: ["compensation", "medical"],
});

const HUMAN_RESOURCES_COMPENSATION_SENSITIVITY = defineSensitivity({
	resourceType: "compensation",
	subjectPolicy: "subject_or_privileged",
	fieldClasses: ["compensation"],
});

/**
 * Defaults are allowed only when every operation assigned to the policy has
 * the same sensitivity semantics. Mixed policies declare operation overrides.
 */
export const HUMAN_RESOURCES_POLICY_SENSITIVITY_DEFAULTS = Object.freeze({
	"hr.employee-profile": defineSensitivity({
		resourceType: "personal_identifiers",
		subjectPolicy: "subject_manager_or_privileged",
		fieldClasses: ["personal_identifiers"],
	}),
	"hr.employee-relations.case": defineSensitivity({
		resourceType: "employee_relations",
		subjectPolicy: "assigned_or_privileged",
		fieldClasses: ["employee_relations_evidence"],
	}),
	[HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID]:
		HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
	[HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID]:
		HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
	"hr.leave": defineSensitivity({
		resourceType: "medical_leave",
		subjectPolicy: "subject_or_privileged",
		fieldClasses: ["medical"],
	}),
	"hr.learning": HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
	[HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID]:
		HUMAN_RESOURCES_COMPENSATION_SENSITIVITY,
	[HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID]:
		HUMAN_RESOURCES_COMPENSATION_SENSITIVITY,
	[HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID]:
		HUMAN_RESOURCES_COMPENSATION_SENSITIVITY,
	[HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID]:
		HUMAN_RESOURCES_COMPENSATION_SENSITIVITY,
	[HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID]:
		HUMAN_RESOURCES_COMPENSATION_SENSITIVITY,
	"hr.recruitment": HUMAN_RESOURCES_BACKGROUND_CHECK_SENSITIVITY,
	"hr.performance": defineSensitivity({
		resourceType: "performance",
		subjectPolicy: "manager_or_privileged",
		fieldClasses: ["employee_relations_evidence"],
	}),
	"hr.talent-assessment": defineSensitivity({
		resourceType: "succession",
		subjectPolicy: "subject_manager_or_privileged",
		fieldClasses: ["succession"],
	}),
	"hr.talent-profile": defineSensitivity({
		resourceType: "succession",
		subjectPolicy: "subject_manager_or_privileged",
		fieldClasses: ["succession"],
	}),
	"hr.succession": defineSensitivity({
		resourceType: "succession",
		subjectPolicy: "privileged_only",
		fieldClasses: ["succession"],
	}),
} as const);

export function defaultHumanResourcesOperationSensitivity(
	authorizationPolicy: string,
): HumanResourcesOperationSensitivity | null {
	return (
		Object.entries(HUMAN_RESOURCES_POLICY_SENSITIVITY_DEFAULTS).find(
			([policyId]) => policyId === authorizationPolicy,
		)?.[1] ?? null
	);
}
