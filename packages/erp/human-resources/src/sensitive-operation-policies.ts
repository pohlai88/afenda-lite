import {
	HUMAN_RESOURCES_COMMAND_IDS,
	HUMAN_RESOURCES_QUERY_IDS,
	type HumanResourcesCommandId,
	type HumanResourcesQueryId,
} from "./module-ids";
import type {
	HumanResourcesSensitiveFieldClass,
	HumanResourcesSensitiveResourceType,
} from "./shared/sensitive-field-types";

export type HumanResourcesSensitiveOperationId =
	| HumanResourcesCommandId
	| HumanResourcesQueryId;

export type HumanResourcesSubjectPolicy =
	| "subject_or_privileged"
	| "manager_or_privileged"
	| "subject_manager_or_privileged"
	| "assigned_or_privileged"
	| "privileged_only";

export interface HumanResourcesSensitiveOperationPolicy {
	fieldClasses: readonly HumanResourcesSensitiveFieldClass[];
	operationPrefixes: readonly string[];
	resourceType: HumanResourcesSensitiveResourceType;
	subjectPolicy: HumanResourcesSubjectPolicy;
}

/**
 * Explicit policy families for every HR operation that handles sensitive data.
 * A coverage test evaluates the complete command/query registers against these
 * rules so a new sensitive operation cannot silently inherit broad module
 * permission behavior.
 */
export const HUMAN_RESOURCES_SENSITIVE_OPERATION_POLICY_RULES = [
	{
		operationPrefixes: [
			"human-resources.person.",
			"human-resources.personal-details.",
			"human-resources.sensitive-identifier.",
			"human-resources.employee-document.",
			"human-resources.work-eligibility.",
		],
		resourceType: "personal_identifiers",
		subjectPolicy: "subject_or_privileged",
		fieldClasses: ["personal_identifiers"],
	},
	{
		operationPrefixes: [
			"human-resources.leave-request.",
			"human-resources.leave-balance.",
			"human-resources.leave-entitlement.",
		],
		resourceType: "medical_leave",
		subjectPolicy: "subject_or_privileged",
		fieldClasses: ["medical"],
	},
	{
		operationPrefixes: [
			"human-resources.compensation-grade.",
			"human-resources.salary-band.",
			"human-resources.employee-compensation.",
			"human-resources.compensation-review.",
			"human-resources.compensation-proposal.",
			"human-resources.approved-compensation-handoff.",
		],
		resourceType: "compensation",
		subjectPolicy: "subject_or_privileged",
		fieldClasses: ["compensation"],
	},
	{
		operationPrefixes: [
			"human-resources.benefit-plan.",
			"human-resources.benefit-enrollment.",
			"human-resources.benefit-enrollment-dependent.",
		],
		resourceType: "benefits",
		subjectPolicy: "subject_or_privileged",
		fieldClasses: ["compensation", "medical"],
	},
	{
		operationPrefixes: ["human-resources.employee-case."],
		resourceType: "employee_relations",
		subjectPolicy: "assigned_or_privileged",
		fieldClasses: ["employee_relations_evidence"],
	},
	{
		operationPrefixes: [
			"human-resources.candidate.",
			"human-resources.application.",
			"human-resources.interview.",
			"human-resources.offer.",
			"human-resources.interview-evaluation.",
			"human-resources.offboarding.record-exit-interview",
		],
		resourceType: "background_check",
		subjectPolicy: "privileged_only",
		fieldClasses: ["background_check", "personal_identifiers"],
	},
	{
		operationPrefixes: [
			"human-resources.performance-goal.",
			"human-resources.performance-cycle.",
			"human-resources.performance-review.",
			"human-resources.improvement-plan.",
			"human-resources.employee-performance-history.",
		],
		resourceType: "performance",
		subjectPolicy: "manager_or_privileged",
		fieldClasses: ["employee_relations_evidence"],
	},
	{
		operationPrefixes: [
			"human-resources.course.",
			"human-resources.session.",
			"human-resources.learning-assignment.",
			"human-resources.learning-attendance.",
			"human-resources.completion.",
			"human-resources.certification.",
		],
		resourceType: "personal_identifiers",
		subjectPolicy: "subject_or_privileged",
		fieldClasses: ["personal_identifiers"],
	},
	{
		operationPrefixes: [
			"human-resources.competency-assessment.",
			"human-resources.employee-competency-profile.",
		],
		resourceType: "succession",
		subjectPolicy: "subject_manager_or_privileged",
		fieldClasses: ["succession"],
	},
	{
		operationPrefixes: ["human-resources.employee.profile."],
		resourceType: "personal_identifiers",
		subjectPolicy: "subject_manager_or_privileged",
		fieldClasses: ["personal_identifiers"],
	},
	{
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
		resourceType: "succession",
		subjectPolicy: "subject_manager_or_privileged",
		fieldClasses: ["succession"],
	},
	{
		operationPrefixes: [
			"human-resources.succession-plan.",
			"human-resources.succession-candidate.",
			"human-resources.position-succession-coverage.",
		],
		resourceType: "succession",
		subjectPolicy: "privileged_only",
		fieldClasses: ["succession"],
	},
] as const satisfies readonly HumanResourcesSensitiveOperationPolicy[];

export function humanResourcesSensitiveOperationPolicy(
	operation: HumanResourcesSensitiveOperationId,
): HumanResourcesSensitiveOperationPolicy | null {
	for (const policy of HUMAN_RESOURCES_SENSITIVE_OPERATION_POLICY_RULES) {
		if (
			policy.operationPrefixes.some((prefix) => operation.startsWith(prefix))
		) {
			return policy;
		}
	}
	return null;
}

export const HUMAN_RESOURCES_SENSITIVE_OPERATION_IDS = [
	...HUMAN_RESOURCES_COMMAND_IDS,
	...HUMAN_RESOURCES_QUERY_IDS,
].filter(
	(operationId): operationId is HumanResourcesSensitiveOperationId =>
		humanResourcesSensitiveOperationPolicy(operationId) !== null,
);
