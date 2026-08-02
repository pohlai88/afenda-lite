import type {
	HumanResourcesSensitiveFieldClass,
	HumanResourcesSensitiveResourceType,
} from "./sensitive-field-types";

export type HumanResourcesSubjectPolicy =
	| "subject_or_privileged"
	| "manager_or_privileged"
	| "subject_manager_or_privileged"
	| "assigned_or_privileged"
	| "privileged_only";

export interface HumanResourcesOperationSensitivity {
	readonly fieldClasses: readonly HumanResourcesSensitiveFieldClass[];
	readonly resourceType: HumanResourcesSensitiveResourceType;
	readonly subjectPolicy: HumanResourcesSubjectPolicy;
}
