/**
 * # Import Types
 *
 * Import batches and row evidence are immutable governance records around an
 * approved source snapshot.
 *
 * Raw source payload retention is optional and must follow data-minimization,
 * access-control, encryption, and retention policy. Normalized proposal data is
 * retained only to the extent required for validation, approval, application,
 * auditability, and safe replay.
 */
import type {
	GovernanceJsonObject,
	GovernedMasterEntityType,
} from "./change-request-types";

export const IMPORT_MODES = [
	"create_only",
	"update_existing",
	"create_or_update",
] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];
export const DEFAULT_IMPORT_MODE =
	"create_or_update" as const satisfies ImportMode;

export const IMPORT_BATCH_STATUSES = [
	"claimed",
	"validating",
	"approval_pending",
	"approved",
	"applying",
	"partially_applied",
	"applied",
	"failed",
	"cancelled",
] as const;
export type ImportBatchStatus = (typeof IMPORT_BATCH_STATUSES)[number];

export const IMPORT_TERMINAL_STATUSES = [
	"applied",
	"cancelled",
] as const satisfies readonly ImportBatchStatus[];

export const IMPORT_BATCH_TERMINAL_STATUSES = IMPORT_TERMINAL_STATUSES;

export const IMPORT_FINDING_SEVERITIES = [
	"error",
	"warning",
	"information",
] as const;
export type ImportFindingSeverity = (typeof IMPORT_FINDING_SEVERITIES)[number];

export const IMPORT_VALIDATION_STATUSES = [
	"pending",
	"validating",
	"valid",
	"invalid",
	"warning",
] as const;
export type ImportValidationStatus =
	(typeof IMPORT_VALIDATION_STATUSES)[number];
export type ImportRowValidationStatus = ImportValidationStatus;

export const IMPORT_MATCH_STATUSES = [
	"not_evaluated",
	"no_match",
	"matched",
	"ambiguous",
	"invalid_key",
	"not_permitted",
] as const;
export type ImportMatchStatus = (typeof IMPORT_MATCH_STATUSES)[number];

export const IMPORT_ROW_OPERATIONS = [
	"create",
	"update",
	"skip",
	"reject",
] as const;
export type ImportRowOperation = (typeof IMPORT_ROW_OPERATIONS)[number];

export const IMPORT_ROW_APPLY_STATUSES = [
	"pending",
	"applying",
	"applied",
	"replayed",
	"failed",
	"skipped",
] as const;
export type ImportRowApplyStatus = (typeof IMPORT_ROW_APPLY_STATUSES)[number];

export const IMPORT_APPLICATION_STATUSES = [
	"applying",
	"applied",
	"replayed",
	"failed",
] as const;
export type ImportApplicationStatus =
	(typeof IMPORT_APPLICATION_STATUSES)[number];

export const IMPORT_PARTIAL_SUCCESS_POLICIES = [
	"allow",
	"reject_batch",
] as const;
export type ImportPartialSuccessPolicy =
	(typeof IMPORT_PARTIAL_SUCCESS_POLICIES)[number];

export type ImportValidationFinding = Readonly<{
	severity: ImportFindingSeverity;
	code: string;
	message: string;
	field?: string;
	rowNumber?: number;
}>;

export type ImportDeterministicMatch =
	| Readonly<{
			status: "not_evaluated" | "no_match";
			policyId: string;
			policyVersion: number;
			ruleId: null;
			matchedTargetId: null;
			matchedTargetVersion: null;
			candidateTargetIds: readonly [];
	  }>
	| Readonly<{
			status: "matched";
			policyId: string;
			policyVersion: number;
			ruleId: string;
			matchedTargetId: string;
			matchedTargetVersion: number;
			candidateTargetIds: readonly [string];
	  }>
	| Readonly<{
			status: "ambiguous";
			policyId: string;
			policyVersion: number;
			ruleId: string;
			matchedTargetId: null;
			matchedTargetVersion: null;
			candidateTargetIds: readonly string[];
	  }>
	| Readonly<{
			status: "invalid_key" | "not_permitted";
			policyId: string;
			policyVersion: number;
			ruleId: string | null;
			matchedTargetId: null;
			matchedTargetVersion: null;
			candidateTargetIds: readonly string[];
	  }>;

type ImportRowApplicationOutcome =
	| Readonly<{
			applyStatus: "pending" | "skipped";
			applyAttemptId: null;
			applyStartedAt: null;
			completedAt: null;
			resultEntityId: null;
			resultEntityVersion: null;
			failureCode: null;
			failureDetails: null;
	  }>
	| Readonly<{
			applyStatus: "applying";
			applyAttemptId: string;
			applyStartedAt: Date;
			completedAt: null;
			resultEntityId: null;
			resultEntityVersion: null;
			failureCode: null;
			failureDetails: null;
	  }>
	| Readonly<{
			applyStatus: "applied" | "replayed";
			applyAttemptId: string;
			applyStartedAt: Date;
			completedAt: Date;
			resultEntityId: string;
			resultEntityVersion: number;
			failureCode: null;
			failureDetails: null;
	  }>
	| Readonly<{
			applyStatus: "failed";
			applyAttemptId: string;
			applyStartedAt: Date;
			completedAt: Date;
			resultEntityId: null;
			resultEntityVersion: null;
			failureCode: string;
			failureDetails: GovernanceJsonObject | null;
	  }>;

export type ImportRowEvidence = Readonly<{
	id: string;
	organizationId: string;
	importBatchId: string;
	rowId: string;
	rowNumber: number;
	sourcePayload: GovernanceJsonObject | null;
	sourcePayloadFingerprint: string;
	normalizedPayload: GovernanceJsonObject;
	entityType: GovernedMasterEntityType;
	match: ImportDeterministicMatch;
	intendedOperation: ImportRowOperation;
	approvedFields: readonly string[];
	validationStatus: ImportValidationStatus;
	validationFindings: readonly ImportValidationFinding[];
	operationFingerprint: string;
	createdAt: Date;
	updatedAt: Date;
	version: number;
}> &
	ImportRowApplicationOutcome;

export type ImportBatchCounters = Readonly<{
	totalCount: number;
	pendingValidationCount: number;
	validCount: number;
	invalidCount: number;
	appliedCount: number;
	replayedCount: number;
	failedCount: number;
	skippedCount: number;
	applyingCount: number;
	pendingApplyCount: number;
	warningCount: number;
}>;

export type ImportBatchRecord = Readonly<{
	id: string;
	organizationId: string;
	entityType: GovernedMasterEntityType;
	mode: ImportMode;
	partialSuccessPolicy: ImportPartialSuccessPolicy;
	status: ImportBatchStatus;
	workflowVersion: number;
	sourceSnapshotId: string;
	sourceFingerprint: string;
	matchPolicyId: string;
	matchPolicyVersion: number;
	mutableFieldAllowlistId: string;
	mutableFieldAllowlistVersion: number;
	uploadedBy: string;
	uploadedAt: Date;
	parsedAt: Date | null;
	validationStartedAt: Date | null;
	validatedAt: Date | null;
	approvalRequestedAt: Date | null;
	approvedBy: string | null;
	approvedAt: Date | null;
	applyStartedAt: Date | null;
	completedAt: Date | null;
	expiresAt: Date | null;
	cancelledAt: Date | null;
	supersededAt: Date | null;
	supersedesBatchId: string | null;
	counters: ImportBatchCounters;
	createdAt: Date;
	updatedAt: Date;
}>;

export type ImportRowApplicationRecord =
	| Readonly<{
			organizationId: string;
			importBatchId: string;
			importRowId: string;
			operationFingerprint: string;
			status: "applying";
			attemptId: string;
			resultEntityId: null;
			resultEntityVersion: null;
			failureCode: null;
			failureDetails: null;
			startedAt: Date;
			completedAt: null;
			version: number;
	  }>
	| Readonly<{
			organizationId: string;
			importBatchId: string;
			importRowId: string;
			operationFingerprint: string;
			status: "applied" | "replayed";
			attemptId: string;
			resultEntityId: string;
			resultEntityVersion: number;
			failureCode: null;
			failureDetails: null;
			startedAt: Date;
			completedAt: Date;
			version: number;
	  }>
	| Readonly<{
			organizationId: string;
			importBatchId: string;
			importRowId: string;
			operationFingerprint: string;
			status: "failed";
			attemptId: string;
			resultEntityId: null;
			resultEntityVersion: null;
			failureCode: string;
			failureDetails: GovernanceJsonObject | null;
			startedAt: Date;
			completedAt: Date;
			version: number;
	  }>;
