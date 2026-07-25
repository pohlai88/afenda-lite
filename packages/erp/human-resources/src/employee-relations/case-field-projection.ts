import type { HumanResourcesFieldProjection } from "../shared/authorization-types";
import type { EmployeeCase, ProjectedEmployeeCase } from "./types";

/** Full case payload for investigators, owners, and exceptional admins. */
export const INVESTIGATOR_CASE_FIELDS = [
	"id",
	"organizationId",
	"employeeId",
	"employmentId",
	"caseType",
	"status",
	"severity",
	"allegationSummary",
	"classificationCode",
	"ownerActorUserId",
	"subjectActorUserId",
	"participants",
	"conflictedActorUserIds",
	"interimAuthority",
	"interimReason",
	"interimStartsOn",
	"interimReviewOn",
	"interimStatus",
	"findingCode",
	"findingSummary",
	"findingRecordedBy",
	"findingRecordedAt",
	"outcomeCode",
	"closedAt",
	"closedBy",
	"version",
	"createdBy",
	"updatedBy",
	"createdAt",
	"updatedAt",
] as const satisfies ReadonlyArray<keyof EmployeeCase>;

/** Reduced payload for case subjects and participants. */
export const PARTICIPANT_CASE_FIELDS = [
	"id",
	"caseType",
	"status",
	"severity",
	"employeeId",
	"version",
	"createdAt",
	"updatedAt",
] as const satisfies ReadonlyArray<keyof EmployeeCase>;

/** Minimal payload for managers of case subjects/participants. */
export const BASIC_CASE_FIELDS = [
	"id",
	"caseType",
	"status",
	"employeeId",
	"version",
] as const satisfies ReadonlyArray<keyof EmployeeCase>;

function serializeCaseField(value: EmployeeCase[keyof EmployeeCase]): unknown {
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

export function applyCaseFieldProjection(
	data: EmployeeCase,
	allowedFields: readonly string[],
): ProjectedEmployeeCase {
	const result: Record<string, unknown> = {};
	for (const field of allowedFields) {
		const key = field as keyof EmployeeCase;
		const value = data[key];
		// Absent optional nullables still appear as null so clients can rely on key presence.
		result[field] = value === undefined ? null : serializeCaseField(value);
	}
	return result as ProjectedEmployeeCase;
}

export function projectEmployeeCaseFromDecision(
	data: EmployeeCase,
	projection: HumanResourcesFieldProjection | undefined,
): ProjectedEmployeeCase {
	if (projection === undefined) {
		return {};
	}
	return applyCaseFieldProjection(data, projection.allowedFields);
}

export function caseProjectionFields(
	fields: readonly (keyof EmployeeCase)[],
): string[] {
	return [...fields];
}
