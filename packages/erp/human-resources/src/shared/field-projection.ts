import {
	HUMAN_RESOURCES_PERMISSION_CANDIDATE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
	HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
	HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
	type HumanResourcesPermission,
} from "../permissions";
import type { HumanResourcesFieldProjection } from "./authorization-types";
import type {
	HumanResourcesSensitiveFieldClass,
	HumanResourcesSensitiveResourceType,
} from "./sensitive-field-types";

export type SensitivityLevel = "standard" | "sensitive" | "highly_restricted";

export interface ProjectedData<T> {
	data: Partial<T>;
	redactedFields: string[];
}

import {
	PERFORMANCE_ASSESSMENT_CONFIDENTIAL_FIELDS,
	PERFORMANCE_REVIEW_CONFIDENTIAL_FIELDS,
	PERFORMANCE_REVIEW_PUBLIC_FIELDS,
} from "../performance/performance-field-projection";

/** Tiered performance field classes — own vs manager vs confidential HR reads. */
export const PERFORMANCE_FIELD_CLASSES = {
	public: [...PERFORMANCE_REVIEW_PUBLIC_FIELDS],
	own: ["acknowledgementNote"],
	manager: ["rating", "commentsSensitive"],
	confidential: [
		...PERFORMANCE_REVIEW_CONFIDENTIAL_FIELDS,
		...PERFORMANCE_ASSESSMENT_CONFIDENTIAL_FIELDS,
	],
} as const;

export type PerformanceFieldAccessTier =
	| "public"
	| "own"
	| "manager"
	| "confidential";

export function partitionPerformanceFieldsByTier(input: {
	tier: PerformanceFieldAccessTier;
	requestedFields?: readonly string[] | undefined;
}): string[] {
	const allowed = performanceFieldsForTier(input.tier);
	if (!input.requestedFields) {
		return [...allowed];
	}
	return input.requestedFields.filter((field) => allowed.includes(field));
}

function performanceFieldsForTier(tier: PerformanceFieldAccessTier): string[] {
	switch (tier) {
		case "public":
			return [...PERFORMANCE_FIELD_CLASSES.public];
		case "own":
			return [
				...PERFORMANCE_FIELD_CLASSES.public,
				...PERFORMANCE_FIELD_CLASSES.own,
			];
		case "manager":
			return [
				...PERFORMANCE_FIELD_CLASSES.public,
				...PERFORMANCE_FIELD_CLASSES.own,
				...PERFORMANCE_FIELD_CLASSES.manager,
			];
		case "confidential":
			return [
				...PERFORMANCE_FIELD_CLASSES.public,
				...PERFORMANCE_FIELD_CLASSES.own,
				...PERFORMANCE_FIELD_CLASSES.manager,
				...PERFORMANCE_FIELD_CLASSES.confidential,
			];
		default: {
			const exhaustive: never = tier;
			return exhaustive;
		}
	}
}

/** Tiered compensation field classes — managers must not inherit payroll handoff. */
export const COMPENSATION_FIELD_CLASSES = {
	public: ["currencyCode", "payFrequency"],
	manager: ["gradeCode", "bandCode"],
	confidential: [
		"baseAmount",
		"allowances",
		"benefits",
		"reviewProposal",
		"proposedBaseAmount",
		"proposedCurrencyCode",
		"confidentialNote",
		"proposedGradeId",
		"proposedSalaryBandId",
		"gradeId",
		"salaryBandId",
	],
	payroll: [
		"baseAmount",
		"currencyCode",
		"payFrequency",
		"effectiveFrom",
		"effectiveTo",
	],
} as const;

export type CompensationFieldAccessTier =
	| "public"
	| "manager"
	| "confidential"
	| "payroll";

/** Employee-level actuals blocked on broad workforce-plan read permissions. */
export const WORKFORCE_PLANNING_EMPLOYEE_ACTUAL_FIELDS = [
	"employeeId",
	"subjectEmployeeId",
	"actualEmployeeIds",
	"employeeActuals",
	"fteByEmployee",
	"headcountByEmployee",
] as const;

const COMPENSATION_SENSITIVE_FIELDS = [
	...COMPENSATION_FIELD_CLASSES.confidential,
	...COMPENSATION_FIELD_CLASSES.payroll,
	...COMPENSATION_FIELD_CLASSES.manager,
	"baseSalary",
	"totalCompensation",
	"salaryGrade",
	"payBand",
	"bonus",
	"equity",
	"currency",
	"bands",
] as const;

const MEDICAL_SENSITIVE_FIELDS = [
	"medicalConditions",
	"disabilities",
	"accommodations",
	"medicalLeave",
	"medicalDetails",
	"workersCompensation",
	"note",
	"rejectionNote",
] as const;

const EMPLOYEE_RELATIONS_SENSITIVE_FIELDS = [
	"disciplinaryActions",
	"investigations",
	"complaints",
	"legalProceedings",
	"witnessStatements",
	"evidence",
] as const;

/** Identifier / PII fields masked unless identity-document sensitive read is held. */
export const PERSONAL_IDENTIFIER_MASK_FIELDS = [
	"identifierLast4",
	"identifierFingerprint",
	"documentRef",
	"ssn",
	"socialSecurityNumber",
	"taxId",
] as const;

const HIGHLY_RESTRICTED_FIELDS = [
	...PERSONAL_IDENTIFIER_MASK_FIELDS,
	"bankAccount",
	"emergencyContacts",
	"personalPhoneNumber",
	"homeAddress",
] as const;

const BACKGROUND_CHECK_SENSITIVE_FIELDS = [
	"backgroundCheckStatus",
	"backgroundCheckResult",
	"criminalRecord",
	"creditCheck",
	"screeningProviderReference",
	"adjudicationNote",
] as const;

const SUCCESSION_SENSITIVE_FIELDS = [
	"readinessLevel",
	"readinessNote",
	"retentionRisk",
	"potentialRating",
	"successionRank",
	"developmentGap",
	"currentClassification",
	"readiness",
	"readinessEffectiveOn",
	"evidenceSummary",
	"level",
	"evidenceSource",
	"classification",
] as const;

/** Succession / talent sensitive field inventory for projection tests and runners. */
export const TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES =
	SUCCESSION_SENSITIVE_FIELDS;

const FIELD_CLASS_FIELDS = {
	personal_identifiers: HIGHLY_RESTRICTED_FIELDS,
	medical: MEDICAL_SENSITIVE_FIELDS,
	compensation: COMPENSATION_SENSITIVE_FIELDS,
	employee_relations_evidence: EMPLOYEE_RELATIONS_SENSITIVE_FIELDS,
	background_check: BACKGROUND_CHECK_SENSITIVE_FIELDS,
	succession: SUCCESSION_SENSITIVE_FIELDS,
} as const satisfies Record<
	HumanResourcesSensitiveFieldClass,
	readonly string[]
>;

/**
 * Partition requested field names into allowed vs denied using sensitive
 * field-class inventories. Non-sensitive requested fields are allowed.
 */
export function partitionRequestedFieldsBySensitivity(input: {
	requestedFields: readonly string[];
	fieldClasses: readonly HumanResourcesSensitiveFieldClass[];
	actorPermissions: ReadonlySet<HumanResourcesPermission>;
}): HumanResourcesFieldProjection {
	const denied = new Set<string>();
	for (const fieldClass of input.fieldClasses) {
		if (canReadFieldClass(fieldClass, input.actorPermissions)) {
			continue;
		}
		for (const field of FIELD_CLASS_FIELDS[fieldClass]) {
			denied.add(field);
		}
	}
	return partitionAgainstDeniedSet(input.requestedFields, denied);
}

/**
 * Partition compensation fields by access tier. Managers receive public+manager
 * only; payroll handoff requires the payroll tier.
 */
export function partitionCompensationFieldsByTier(input: {
	requestedFields: readonly string[];
	tier: CompensationFieldAccessTier;
}): HumanResourcesFieldProjection {
	const allowedSet = new Set<string>(compensationFieldsForTier(input.tier));
	const knownCompensationFields = new Set<string>([
		...COMPENSATION_FIELD_CLASSES.public,
		...COMPENSATION_FIELD_CLASSES.manager,
		...COMPENSATION_FIELD_CLASSES.confidential,
		...COMPENSATION_FIELD_CLASSES.payroll,
	]);
	const allowedFields: string[] = [];
	const deniedFields: string[] = [];
	for (const field of input.requestedFields) {
		if (!knownCompensationFields.has(field) || allowedSet.has(field)) {
			allowedFields.push(field);
		} else {
			deniedFields.push(field);
		}
	}
	return { allowedFields, deniedFields };
}

export function compensationFieldsForTier(
	tier: CompensationFieldAccessTier,
): readonly string[] {
	switch (tier) {
		case "public":
			return COMPENSATION_FIELD_CLASSES.public;
		case "manager":
			return [
				...COMPENSATION_FIELD_CLASSES.public,
				...COMPENSATION_FIELD_CLASSES.manager,
			];
		case "confidential":
			return [
				...COMPENSATION_FIELD_CLASSES.public,
				...COMPENSATION_FIELD_CLASSES.manager,
				...COMPENSATION_FIELD_CLASSES.confidential,
			];
		case "payroll":
			return [
				...COMPENSATION_FIELD_CLASSES.public,
				...COMPENSATION_FIELD_CLASSES.manager,
				...COMPENSATION_FIELD_CLASSES.confidential,
				...COMPENSATION_FIELD_CLASSES.payroll,
			];
		default: {
			const _exhaustive: never = tier;
			return _exhaustive;
		}
	}
}

/** Deny employee-level actual fields on workforce-plan reads. */
export function partitionWorkforcePlanningReadFields(input: {
	requestedFields: readonly string[];
}): HumanResourcesFieldProjection {
	const denied = new Set<string>(WORKFORCE_PLANNING_EMPLOYEE_ACTUAL_FIELDS);
	return partitionAgainstDeniedSet(input.requestedFields, denied);
}

function partitionAgainstDeniedSet(
	requestedFields: readonly string[],
	denied: ReadonlySet<string>,
): HumanResourcesFieldProjection {
	const allowedFields: string[] = [];
	const deniedFields: string[] = [];
	for (const field of requestedFields) {
		if (denied.has(field)) {
			deniedFields.push(field);
		} else {
			allowedFields.push(field);
		}
	}
	return { allowedFields, deniedFields };
}

function canReadFieldClass(
	fieldClass: HumanResourcesSensitiveFieldClass,
	actorPermissions: ReadonlySet<HumanResourcesPermission>,
): boolean {
	switch (fieldClass) {
		case "personal_identifiers":
			return (
				actorPermissions.has(
					HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
				) ||
				actorPermissions.has(
					HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
				)
			);
		case "medical":
			return actorPermissions.has(
				HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
			);
		case "compensation":
			return (
				actorPermissions.has(HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ) ||
				actorPermissions.has(HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE)
			);
		case "employee_relations_evidence":
			return actorPermissions.has(
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
			);
		case "background_check":
			return actorPermissions.has(HUMAN_RESOURCES_PERMISSION_CANDIDATE_MANAGE);
		case "succession":
			return (
				actorPermissions.has(
					HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
				) ||
				actorPermissions.has(
					HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
				)
			);
		default:
			return false;
	}
}

export function applyResourceFieldProjection<T extends Record<string, unknown>>(
	data: T,
	input: {
		resourceType: HumanResourcesSensitiveResourceType;
		fieldClasses: readonly HumanResourcesSensitiveFieldClass[];
		actorPermissions: ReadonlySet<HumanResourcesPermission>;
	},
): ProjectedData<T> {
	const projected: Partial<T> = { ...data };
	const redactedFields: string[] = [];
	for (const fieldClass of input.fieldClasses) {
		if (canReadFieldClass(fieldClass, input.actorPermissions)) {
			continue;
		}
		for (const field of FIELD_CLASS_FIELDS[fieldClass]) {
			if (!(field in projected)) {
				continue;
			}
			delete projected[field as keyof T];
			redactedFields.push(field);
		}
	}
	return { data: projected, redactedFields };
}

export function applySensitivityProjection<T extends Record<string, unknown>>(
	data: T,
	sensitivity: SensitivityLevel,
	actorPermissions: Set<HumanResourcesPermission>,
): ProjectedData<T> {
	const result: Partial<T> = { ...data };
	const redactedFields: string[] = [];

	const fieldsToCheck = getFieldsToCheckForSensitivity(sensitivity);

	for (const field of fieldsToCheck) {
		if (shouldRedactField(field, sensitivity, actorPermissions)) {
			delete result[field as keyof T];
			redactedFields.push(field);
		}
	}

	return {
		data: result,
		redactedFields,
	};
}

function getFieldsToCheckForSensitivity(
	sensitivity: SensitivityLevel,
): string[] {
	switch (sensitivity) {
		case "standard":
			return [];
		case "sensitive":
			return [
				...COMPENSATION_SENSITIVE_FIELDS,
				...MEDICAL_SENSITIVE_FIELDS,
				...EMPLOYEE_RELATIONS_SENSITIVE_FIELDS,
			];
		case "highly_restricted":
			return [
				...COMPENSATION_SENSITIVE_FIELDS,
				...MEDICAL_SENSITIVE_FIELDS,
				...EMPLOYEE_RELATIONS_SENSITIVE_FIELDS,
				...HIGHLY_RESTRICTED_FIELDS,
				...BACKGROUND_CHECK_SENSITIVE_FIELDS,
				...SUCCESSION_SENSITIVE_FIELDS,
			];
		default: {
			const _exhaustive: never = sensitivity;
			return _exhaustive;
		}
	}
}

function shouldRedactField(
	field: string,
	sensitivity: SensitivityLevel,
	actorPermissions: Set<HumanResourcesPermission>,
): boolean {
	if (
		actorPermissions.has(HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER) ||
		actorPermissions.has(HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE) ||
		actorPermissions.has(HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE)
	) {
		return false;
	}

	if ((COMPENSATION_SENSITIVE_FIELDS as readonly string[]).includes(field)) {
		return !actorPermissions.has(HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ);
	}

	if ((MEDICAL_SENSITIVE_FIELDS as readonly string[]).includes(field)) {
		return !actorPermissions.has(
			HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
		);
	}

	if (
		(EMPLOYEE_RELATIONS_SENSITIVE_FIELDS as readonly string[]).includes(field)
	) {
		return !actorPermissions.has(
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
		);
	}

	if ((HIGHLY_RESTRICTED_FIELDS as readonly string[]).includes(field)) {
		return !actorPermissions.has(
			HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
		);
	}

	return sensitivity !== "standard";
}

export function createProjectionFilter<T extends Record<string, unknown>>(
	sensitivity: SensitivityLevel,
	actorPermissions: Set<HumanResourcesPermission>,
) {
	return (data: T): ProjectedData<T> =>
		applySensitivityProjection(data, sensitivity, actorPermissions);
}

export function redactedFieldsForResource(
	resourceType: string | undefined,
	sensitivity: "sensitive" | "highly_restricted",
): string[] {
	if (resourceType === "performance") {
		return [
			...PERFORMANCE_FIELD_CLASSES.manager,
			...PERFORMANCE_FIELD_CLASSES.confidential,
		];
	}
	if (resourceType === "leave") {
		return ["note", "rejectionNote", "medicalDetails"];
	}
	if (resourceType === "compensation") {
		return sensitivity === "highly_restricted"
			? ["baseAmount", "currencyCode", "effectiveFrom", "bands"]
			: [];
	}
	if (resourceType === "employee-document") {
		return ["identifierLast4", "identifierFingerprint", "documentRef"];
	}
	if (resourceType === "employee-case") {
		return [...EMPLOYEE_RELATIONS_SENSITIVE_FIELDS];
	}
	if (resourceType === "background-check") {
		return [...BACKGROUND_CHECK_SENSITIVE_FIELDS];
	}
	if (resourceType === "succession") {
		return [...SUCCESSION_SENSITIVE_FIELDS];
	}
	return [];
}
