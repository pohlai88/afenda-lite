import { fail, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";
import type { ImportFindingSeverity } from "./import-types";
import type { GovernancePermission } from "./permissions";

export const GOVERNANCE_FAILURE_CODES = [
	"MASTER_DATA_GOVERNANCE_AUTHORIZATION_UNAVAILABLE",
	"MASTER_DATA_GOVERNANCE_INVALID_TRANSITION",
	"MASTER_DATA_GOVERNANCE_REASON_REQUIRED",
	"MASTER_DATA_GOVERNANCE_PERMISSION_REQUIRED",
	"MASTER_DATA_GOVERNANCE_ACTOR_SEGREGATION_VIOLATION",
	"MASTER_DATA_GOVERNANCE_PROPOSAL_VERSION_CONFLICT",
	"MASTER_DATA_GOVERNANCE_WORKFLOW_VERSION_CONFLICT",
	"MASTER_DATA_GOVERNANCE_ALLOWLIST_VERSION_CONFLICT",
	"MASTER_DATA_GOVERNANCE_TARGET_VERSION_CONFLICT",
	"MASTER_DATA_GOVERNANCE_FIELD_FORBIDDEN",
	"MASTER_DATA_GOVERNANCE_POLICY_MISMATCH",
	"MASTER_DATA_GOVERNANCE_REQUEST_EXPIRED",
	"MASTER_DATA_GOVERNANCE_REQUEST_NOT_APPROVED",
	"MASTER_DATA_GOVERNANCE_DUPLICATE_APPLY",
	"MASTER_DATA_GOVERNANCE_MERGE_NOT_AUTHORIZED",
	"MASTER_DATA_GOVERNANCE_DUPLICATE_WARNING_INVALID",
	"MASTER_DATA_GOVERNANCE_MERGE_CONFLICT_INVALID",
	"MASTER_DATA_GOVERNANCE_MERGE_CONFLICT_UNRESOLVED",
	"MASTER_DATA_IMPORT_VALIDATION_FAILED",
	"MASTER_DATA_IMPORT_WARNING_ACKNOWLEDGEMENT_REQUIRED",
] as const;

export type GovernanceFailureCode = (typeof GOVERNANCE_FAILURE_CODES)[number];

export const GOVERNANCE_VERSION_KINDS = [
	"proposal",
	"workflow",
	"allowlist",
	"target",
] as const;

export type GovernanceVersionKind = (typeof GOVERNANCE_VERSION_KINDS)[number];

export type ImportValidationFailureFinding = Readonly<{
	severity: ImportFindingSeverity;
	code: string;
	message: string;
	field?: string;
	rowNumber?: number;
}>;

export type GovernanceFailureDetails = MasterFailureDetails &
	Readonly<{
		governanceCode: GovernanceFailureCode;
		entityType?: string;
		entityId?: string;
		organizationId?: string;
		operation?: string;
		currentStatus?: string;
		targetStatus?: string;
		requiredPermission?: GovernancePermission;
		requiredReason?: string;
		versionKind?: GovernanceVersionKind;
		expectedVersion?: number;
		actualVersion?: number;
		fields?: readonly string[];
		policyId?: string;
		expected?: unknown;
		actual?: unknown;
		requestId?: string;
		mergeRequestId?: string;
		duplicateWarningId?: string;
		conflictId?: string;
		conflictIds?: readonly string[];
		conflictArea?: string;
		sourceEntityId?: string;
		targetEntityId?: string;
		validationReason?: string;
		errorCount?: number;
		warningCount?: number;
		warningAcknowledgementRequired?: boolean;
		findings?: readonly ImportValidationFailureFinding[];
	}>;

export function governanceInvalidTransition(input: {
	operation: string;
	currentStatus: string;
	targetStatus: string;
}): Result<never> {
	return fail("CONFLICT", "Governance workflow transition is not allowed", {
		reason: "MASTER_INVALID_STATE",
		governanceCode: "MASTER_DATA_GOVERNANCE_INVALID_TRANSITION",
		operation: input.operation,
		currentStatus: input.currentStatus,
		targetStatus: input.targetStatus,
	} satisfies GovernanceFailureDetails);
}

export function governanceReasonRequired(input: {
	operation: string;
	requiredReason: string;
}): Result<never> {
	return fail("BAD_REQUEST", "Governance transition reason is required", {
		reason: "MASTER_VALIDATION_FAILED",
		governanceCode: "MASTER_DATA_GOVERNANCE_REASON_REQUIRED",
		operation: input.operation,
		requiredReason: input.requiredReason,
	} satisfies GovernanceFailureDetails);
}

export function governancePermissionRequired(input: {
	requiredPermission: GovernancePermission;
	operation?: string;
}): Result<never> {
	return fail("FORBIDDEN", "Missing required governance permission", {
		reason: "MASTER_PERMISSION_DENIED",
		governanceCode: "MASTER_DATA_GOVERNANCE_PERMISSION_REQUIRED",
		requiredPermission: input.requiredPermission,
		operation: input.operation,
	} satisfies GovernanceFailureDetails);
}

export function governanceAuthorizationUnavailable(input: {
	requiredPermission: GovernancePermission;
	operation?: string;
}): Result<never> {
	return fail(
		"INTERNAL_ERROR",
		"Governance authorization service is unavailable",
		{
			reason: "MASTER_DEPENDENCY_UNAVAILABLE",
			governanceCode: "MASTER_DATA_GOVERNANCE_AUTHORIZATION_UNAVAILABLE",
			requiredPermission: input.requiredPermission,
			operation: input.operation,
		} satisfies GovernanceFailureDetails,
	);
}

export function governanceActorSegregationViolation(input: {
	operation: string;
	fields: readonly string[];
}): Result<never> {
	return fail("FORBIDDEN", "Governance actor segregation rule failed", {
		reason: "MASTER_MAKER_CHECKER_VIOLATION",
		governanceCode: "MASTER_DATA_GOVERNANCE_ACTOR_SEGREGATION_VIOLATION",
		operation: input.operation,
		fields: normalizeStrings(input.fields),
	} satisfies GovernanceFailureDetails);
}

export function governanceVersionConflict(input: {
	operation: string;
	expectedVersion: number;
	actualVersion: number;
	versionKind: GovernanceVersionKind;
	entityId?: string;
}): Result<never> {
	const governanceCodeByVersionKind = {
		proposal: "MASTER_DATA_GOVERNANCE_PROPOSAL_VERSION_CONFLICT",
		workflow: "MASTER_DATA_GOVERNANCE_WORKFLOW_VERSION_CONFLICT",
		allowlist: "MASTER_DATA_GOVERNANCE_ALLOWLIST_VERSION_CONFLICT",
		target: "MASTER_DATA_GOVERNANCE_TARGET_VERSION_CONFLICT",
	} as const satisfies Record<GovernanceVersionKind, GovernanceFailureCode>;

	return fail("CONFLICT", "Governance version conflict", {
		reason: "MASTER_VERSION_CONFLICT",
		governanceCode: governanceCodeByVersionKind[input.versionKind],
		operation: input.operation,
		entityId: input.entityId,
		versionKind: input.versionKind,
		expectedVersion: input.expectedVersion,
		actualVersion: input.actualVersion,
	} satisfies GovernanceFailureDetails);
}

export function governanceFieldsForbidden(input: {
	policyId: string;
	fields: readonly string[];
	operation?: string;
}): Result<never> {
	return fail("BAD_REQUEST", "Governance policy forbids one or more fields", {
		reason: "MASTER_VALIDATION_FAILED",
		governanceCode: "MASTER_DATA_GOVERNANCE_FIELD_FORBIDDEN",
		policyId: input.policyId,
		operation: input.operation,
		fields: normalizeStrings(input.fields),
	} satisfies GovernanceFailureDetails);
}

export function governancePolicyMismatch(input: {
	policyId: string;
	expected: unknown;
	actual: unknown;
	operation?: string;
}): Result<never> {
	return fail("CONFLICT", "Governance policy does not match request context", {
		reason: "MASTER_INVALID_STATE",
		governanceCode: "MASTER_DATA_GOVERNANCE_POLICY_MISMATCH",
		policyId: input.policyId,
		operation: input.operation,
		expected: input.expected,
		actual: input.actual,
	} satisfies GovernanceFailureDetails);
}

export function governanceRequestNotApproved(input: {
	operation: string;
	currentStatus: string;
	entityId?: string;
}): Result<never> {
	return fail("VALIDATION_ERROR", "Approved governance request is required", {
		reason: "MASTER_CHANGE_REQUEST_INVALID",
		governanceCode: "MASTER_DATA_GOVERNANCE_REQUEST_NOT_APPROVED",
		operation: input.operation,
		entityId: input.entityId,
		currentStatus: input.currentStatus,
		targetStatus: "approved",
	} satisfies GovernanceFailureDetails);
}

export function governanceRequestExpired(input: {
	operation: string;
	entityId?: string;
}): Result<never> {
	return fail("CONFLICT", "Governance request is expired", {
		reason: "MASTER_INVALID_STATE",
		governanceCode: "MASTER_DATA_GOVERNANCE_REQUEST_EXPIRED",
		operation: input.operation,
		entityId: input.entityId,
		currentStatus: "expired",
	} satisfies GovernanceFailureDetails);
}

export function governanceDuplicateApply(input: {
	operation: string;
	entityId: string;
}): Result<never> {
	return fail("CONFLICT", "Governance operation was already applied", {
		reason: "MASTER_IDEMPOTENT_REPLAY",
		governanceCode: "MASTER_DATA_GOVERNANCE_DUPLICATE_APPLY",
		operation: input.operation,
		entityId: input.entityId,
		currentStatus: "applied",
	} satisfies GovernanceFailureDetails);
}

export function governanceMergeNotAuthorized(input: {
	operation: string;
	organizationId?: string;
	requestId?: string;
	duplicateWarningId?: string;
	sourceEntityId: string;
	targetEntityId: string;
}): Result<never> {
	return fail("CONFLICT", "Merge is not authorized by governance policy", {
		reason: "MASTER_CHANGE_REQUEST_INVALID",
		governanceCode: "MASTER_DATA_GOVERNANCE_MERGE_NOT_AUTHORIZED",
		operation: input.operation,
		organizationId: input.organizationId,
		requestId: input.requestId,
		duplicateWarningId: input.duplicateWarningId,
		sourceEntityId: input.sourceEntityId,
		targetEntityId: input.targetEntityId,
	} satisfies GovernanceFailureDetails);
}

export function governanceDuplicateWarningInvalid(input: {
	operation: string;
	validationReason: string;
	entityId?: string;
	fields?: readonly string[];
}): Result<never> {
	return fail("BAD_REQUEST", "Duplicate warning record is invalid", {
		reason: "MASTER_VALIDATION_FAILED",
		governanceCode: "MASTER_DATA_GOVERNANCE_DUPLICATE_WARNING_INVALID",
		operation: input.operation,
		entityId: input.entityId,
		validationReason: input.validationReason,
		fields:
			input.fields === undefined ? undefined : normalizeStrings(input.fields),
	} satisfies GovernanceFailureDetails);
}

export function governanceMergeConflictInvalid(input: {
	operation: string;
	mergeRequestId?: string;
	conflictId: string;
	area: string;
	field: string;
	validationReason: string;
}): Result<never> {
	return fail("BAD_REQUEST", "Merge conflict resolution is invalid", {
		reason: "MASTER_VALIDATION_FAILED",
		governanceCode: "MASTER_DATA_GOVERNANCE_MERGE_CONFLICT_INVALID",
		operation: input.operation,
		mergeRequestId: input.mergeRequestId,
		conflictId: input.conflictId,
		conflictArea: input.area,
		fields: [input.field],
		validationReason: input.validationReason,
	} satisfies GovernanceFailureDetails);
}

export function governanceMergeConflictUnresolved(input: {
	operation: string;
	mergeRequestId: string;
	conflictIds: readonly string[];
	fields: readonly string[];
}): Result<never> {
	return fail("CONFLICT", "Merge contains unresolved governed conflicts", {
		reason: "MASTER_CHANGE_REQUEST_INVALID",
		governanceCode: "MASTER_DATA_GOVERNANCE_MERGE_CONFLICT_UNRESOLVED",
		operation: input.operation,
		mergeRequestId: input.mergeRequestId,
		conflictIds: input.conflictIds,
		fields: normalizeStrings(input.fields),
	} satisfies GovernanceFailureDetails);
}

export function importValidationFailed(input: {
	operation: string;
	entityId: string;
	errorCount: number;
	warningCount: number;
	warningAcknowledgementRequired?: boolean;
	findings: readonly ImportValidationFailureFinding[];
}): Result<never> {
	const warningOnly =
		input.errorCount === 0 && input.warningAcknowledgementRequired === true;

	return fail(
		warningOnly ? "CONFLICT" : "BAD_REQUEST",
		warningOnly
			? "Import warnings require acknowledgement"
			: "Import validation failed",
		{
			reason: warningOnly
				? "MASTER_CHANGE_REQUEST_INVALID"
				: "MASTER_VALIDATION_FAILED",
			governanceCode: warningOnly
				? "MASTER_DATA_IMPORT_WARNING_ACKNOWLEDGEMENT_REQUIRED"
				: "MASTER_DATA_IMPORT_VALIDATION_FAILED",
			operation: input.operation,
			entityId: input.entityId,
			errorCount: input.errorCount,
			warningCount: input.warningCount,
			warningAcknowledgementRequired: input.warningAcknowledgementRequired,
			findings: input.findings,
		} satisfies GovernanceFailureDetails,
	);
}

function normalizeStrings(values: readonly string[]): readonly string[] {
	return [
		...new Set(values.map((value) => value.trim()).filter(Boolean)),
	].sort();
}
