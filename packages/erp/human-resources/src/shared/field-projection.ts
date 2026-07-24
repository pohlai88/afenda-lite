import type { HumanResourcesPermission } from "../authorization";
import {
	HUMAN_RESOURCES_PERMISSION_CANDIDATE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
	HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
} from "../permissions";
import type {
	HumanResourcesSensitiveFieldClass,
	HumanResourcesSensitiveResourceType,
} from "./contextual-authorization";

export type SensitivityLevel = "standard" | "sensitive" | "highly_restricted";

export interface ProjectedData<T> {
	data: Partial<T>;
	redactedFields: string[];
}

const COMPENSATION_SENSITIVE_FIELDS = [
	"baseAmount",
	"baseSalary",
	"totalCompensation",
	"salaryGrade",
	"payBand",
	"bonus",
	"equity",
	"benefits",
	"currency",
	"currencyCode",
	"bands",
	"effectiveFrom",
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

const HIGHLY_RESTRICTED_FIELDS = [
	"ssn",
	"socialSecurityNumber",
	"taxId",
	"bankAccount",
	"emergencyContacts",
	"personalPhoneNumber",
	"homeAddress",
	"identifierLast4",
	"identifierFingerprint",
	"documentRef",
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
] as const;

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

function canReadFieldClass(
	fieldClass: HumanResourcesSensitiveFieldClass,
	actorPermissions: ReadonlySet<HumanResourcesPermission>,
): boolean {
	switch (fieldClass) {
		case "personal_identifiers":
			return actorPermissions.has(
				HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
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
		if (canReadFieldClass(fieldClass, input.actorPermissions)) continue;
		for (const field of FIELD_CLASS_FIELDS[fieldClass]) {
			if (!(field in projected)) continue;
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
	return (data: T): ProjectedData<T> => {
		return applySensitivityProjection(data, sensitivity, actorPermissions);
	};
}

export function redactedFieldsForResource(
	resourceType: string | undefined,
	sensitivity: "sensitive" | "highly_restricted",
): string[] {
	if (resourceType === "performance") {
		return ["commentsSensitive", "rating", "overallRating"];
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
