import { errorResult, type Result } from "@afenda/errors";

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
		entityType?: string | undefined;
		entityId?: string | undefined;
		organizationId?: string | undefined;
		operation?: string | undefined;
		currentStatus?: string | undefined;
		targetStatus?: string | undefined;
		requiredPermission?: GovernancePermission | undefined;
		requiredReason?: string | undefined;
		versionKind?: GovernanceVersionKind | undefined;
		expectedVersion?: number | undefined;
		actualVersion?: number | undefined;
		fields?: readonly string[] | undefined;
		policyId?: string | undefined;
		expected?: unknown;
		actual?: unknown;
		requestId?: string | undefined;
		mergeRequestId?: string | undefined;
		duplicateWarningId?: string | undefined;
		conflictId?: string | undefined;
		conflictIds?: readonly string[] | undefined;
		conflictArea?: string | undefined;
		sourceEntityId?: string | undefined;
		targetEntityId?: string | undefined;
		validationReason?: string | undefined;
		errorCount?: number | undefined;
		warningCount?: number | undefined;
		warningAcknowledgementRequired?: boolean | undefined;
		findings?: readonly ImportValidationFailureFinding[] | undefined;
	}>;

export function governanceInvalidTransition(_input: {
	operation: string;
	currentStatus: string;
	targetStatus: string;
}): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Governance workflow transition is not allowed",
	});
}

export function governanceReasonRequired(_input: {
	operation: string;
	requiredReason: string;
}): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "Governance transition reason is required",
	});
}

export function governancePermissionRequired(_input: {
	requiredPermission: GovernancePermission;
	operation?: string | undefined;
}): Result<never> {
	return errorResult.fail("FORBIDDEN");
}

export function governanceAuthorizationUnavailable(_input: {
	requiredPermission: GovernancePermission;
	operation?: string | undefined;
}): Result<never> {
	return errorResult.fail("INTERNAL_ERROR");
}

export function governanceActorSegregationViolation(_input: {
	operation: string;
	fields: readonly string[];
}): Result<never> {
	return errorResult.fail("FORBIDDEN");
}

export function governanceVersionConflict(_input: {
	operation: string;
	expectedVersion: number;
	actualVersion: number;
	versionKind: GovernanceVersionKind;
	entityId?: string | undefined;
}): Result<never> {
	const _governanceCodeByVersionKind = {
		proposal: "MASTER_DATA_GOVERNANCE_PROPOSAL_VERSION_CONFLICT",
		workflow: "MASTER_DATA_GOVERNANCE_WORKFLOW_VERSION_CONFLICT",
		allowlist: "MASTER_DATA_GOVERNANCE_ALLOWLIST_VERSION_CONFLICT",
		target: "MASTER_DATA_GOVERNANCE_TARGET_VERSION_CONFLICT",
	} as const satisfies Record<GovernanceVersionKind, GovernanceFailureCode>;

	return errorResult.fail("CONFLICT", {
		publicMessage: "Governance version conflict",
	});
}

export function governanceFieldsForbidden(_input: {
	policyId: string;
	fields: readonly string[];
	operation?: string | undefined;
}): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "Governance policy forbids one or more fields",
	});
}

export function governancePolicyMismatch(_input: {
	policyId: string;
	expected: unknown;
	actual: unknown;
	operation?: string | undefined;
}): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Governance policy does not match request context",
	});
}

export function governanceRequestNotApproved(_input: {
	operation: string;
	currentStatus: string;
	entityId?: string | undefined;
}): Result<never> {
	return errorResult.fail("VALIDATION_ERROR", {
		publicMessage: "Approved governance request is required",
	});
}

export function governanceRequestExpired(_input: {
	operation: string;
	entityId?: string | undefined;
}): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Governance request is expired",
	});
}

export function governanceDuplicateApply(_input: {
	operation: string;
	entityId: string;
}): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Governance operation was already applied",
	});
}

export function governanceMergeNotAuthorized(_input: {
	operation: string;
	organizationId?: string | undefined;
	requestId?: string | undefined;
	duplicateWarningId?: string | undefined;
	sourceEntityId: string;
	targetEntityId: string;
}): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Merge is not authorized by governance policy",
	});
}

export function governanceDuplicateWarningInvalid(_input: {
	operation: string;
	validationReason: string;
	entityId?: string | undefined;
	fields?: readonly string[] | undefined;
}): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "Duplicate warning record is invalid",
	});
}

export function governanceMergeConflictInvalid(_input: {
	operation: string;
	mergeRequestId?: string | undefined;
	conflictId: string;
	area: string;
	field: string;
	validationReason: string;
}): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "Merge conflict resolution is invalid",
	});
}

export function governanceMergeConflictUnresolved(_input: {
	operation: string;
	mergeRequestId: string;
	conflictIds: readonly string[];
	fields: readonly string[];
}): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Merge contains unresolved governed conflicts",
	});
}

export function importValidationFailed(input: {
	operation: string;
	entityId: string;
	errorCount: number;
	warningCount: number;
	warningAcknowledgementRequired?: boolean | undefined;
	findings: readonly ImportValidationFailureFinding[];
}): Result<never> {
	const warningOnly =
		input.errorCount === 0 && input.warningAcknowledgementRequired === true;

	return warningOnly
		? errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
			})
		: errorResult.fail("BAD_REQUEST", {
				publicMessage: "The request is invalid",
			});
}

function _normalizeStrings(values: readonly string[]): readonly string[] {
	return [
		...new Set(values.map((value) => value.trim()).filter(Boolean)),
	].sort();
}
