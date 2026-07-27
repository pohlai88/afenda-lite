import { ok, type Result } from "@afenda/errors/result";

import {
	type DuplicateWarningRecord,
	isDuplicateMatchingSignalAllowed,
	normalizeDuplicateWarningPair,
} from "./duplicate-warning";
import {
	governanceDuplicateWarningInvalid,
	governanceFieldsForbidden,
	governanceMergeNotAuthorized,
} from "./governance-errors";

const MERGE_OPERATION = "party.merge" as const;

export const MERGE_AUTHORIZATION_STATUSES = ["approved", "applying"] as const;

const MERGE_AUTHORIZATION_STATUS_SET = new Set<string>(
	MERGE_AUTHORIZATION_STATUSES,
);

export type MergeAuthorizationStatus =
	(typeof MERGE_AUTHORIZATION_STATUSES)[number];

/**
 * Trusted projection loaded from the package-owned merge-request store.
 *
 * This must never be constructed directly from untrusted command or HTTP input.
 */
export type ApprovedMergeAuthorization = Readonly<{
	id: string;
	organizationId: string;
	status: string;
	sourceEntityId: string;
	targetEntityId: string;
	sourceExpectedVersion: number;
	targetExpectedVersion: number;
	expiresAt: Date | null;
	supersededAt: Date | null;
	appliedAt: Date | null;
	workflowVersion: number;
}>;

export type MergeAuthorizationGateInput = Readonly<{
	organizationId: string;
	warning: Pick<
		DuplicateWarningRecord,
		"id" | "sourceEntityId" | "candidateEntityId"
	>;
	authorization: ApprovedMergeAuthorization | null;
	currentSourceVersion: number;
	currentTargetVersion: number;
	expectedWorkflowVersion: number;
	now: Date;
}>;

/**
 * Verifies that a duplicate pair has separate, authoritative merge approval.
 *
 * A duplicate warning is advisory evidence only. It never authorizes a merge.
 *
 * This policy gate must be followed by atomic persistence predicates covering:
 *
 * - organization ID
 * - merge-request status
 * - merge-request workflow version
 * - source entity version
 * - target entity version
 *
 * Preflight validation alone does not replace database CAS enforcement.
 */
export function assertApprovedMergeAuthorization(
	input: MergeAuthorizationGateInput,
): Result<true> {
	const {
		authorization,
		currentSourceVersion,
		currentTargetVersion,
		expectedWorkflowVersion,
		now,
		organizationId,
		warning,
	} = input;

	if (authorization === null) {
		return mergeNotAuthorized(warning);
	}

	if (
		!isNonEmptyIdentifier(organizationId) ||
		!isNonEmptyIdentifier(warning.sourceEntityId) ||
		!isNonEmptyIdentifier(warning.candidateEntityId) ||
		!isNonEmptyIdentifier(authorization.sourceEntityId) ||
		!isNonEmptyIdentifier(authorization.targetEntityId)
	) {
		return mergeNotAuthorized(warning);
	}

	if (
		!Number.isSafeInteger(currentSourceVersion) ||
		currentSourceVersion < 0 ||
		!Number.isSafeInteger(currentTargetVersion) ||
		currentTargetVersion < 0 ||
		!Number.isSafeInteger(expectedWorkflowVersion) ||
		expectedWorkflowVersion < 0
	) {
		return mergeNotAuthorized(warning);
	}

	if (authorization.organizationId !== organizationId) {
		return mergeNotAuthorized(warning);
	}

	const warningPair = normalizeDuplicateWarningPair(
		warning.sourceEntityId,
		warning.candidateEntityId,
	);
	const authorizationPair = normalizeDuplicateWarningPair(
		authorization.sourceEntityId,
		authorization.targetEntityId,
	);
	if (
		authorizationPair.sourceEntityId !== warningPair.sourceEntityId ||
		authorizationPair.candidateEntityId !== warningPair.candidateEntityId
	) {
		return mergeNotAuthorized(warning);
	}

	if (!isAuthorizedStatus(authorization.status)) {
		return mergeNotAuthorized(warning);
	}

	if (authorization.supersededAt !== null || authorization.appliedAt !== null) {
		return mergeNotAuthorized(warning);
	}

	if (!isValidDate(now)) {
		return mergeNotAuthorized(warning);
	}

	if (
		authorization.expiresAt !== null &&
		(!isValidDate(authorization.expiresAt) ||
			authorization.expiresAt.getTime() <= now.getTime())
	) {
		return mergeNotAuthorized(warning);
	}

	if (authorization.workflowVersion !== expectedWorkflowVersion) {
		return mergeNotAuthorized(warning);
	}

	if (authorization.sourceExpectedVersion !== currentSourceVersion) {
		return mergeNotAuthorized(warning);
	}

	if (authorization.targetExpectedVersion !== currentTargetVersion) {
		return mergeNotAuthorized(warning);
	}

	return ok(true);
}

export function validateDuplicateWarningRecord(
	warning: DuplicateWarningRecord,
): Result<true> {
	if (
		warning.id.trim().length === 0 ||
		warning.organizationId.trim().length === 0 ||
		warning.sourceEntityId.trim().length === 0 ||
		warning.candidateEntityId.trim().length === 0
	) {
		return duplicateWarningInvalid("identifier_required");
	}

	if (warning.sourceEntityId === warning.candidateEntityId) {
		return duplicateWarningInvalid(
			"duplicate_pair_must_contain_distinct_entities",
		);
	}

	const normalizedPair = normalizeDuplicateWarningPair(
		warning.sourceEntityId,
		warning.candidateEntityId,
	);
	if (
		warning.sourceEntityId !== normalizedPair.sourceEntityId ||
		warning.candidateEntityId !== normalizedPair.candidateEntityId
	) {
		return duplicateWarningInvalid("duplicate_pair_not_canonical");
	}

	if (
		!Number.isFinite(warning.confidence) ||
		warning.confidence < 0 ||
		warning.confidence > 1
	) {
		return duplicateWarningInvalid("confidence_out_of_range");
	}

	if (!Number.isSafeInteger(warning.version) || warning.version < 1) {
		return duplicateWarningInvalid("invalid_version");
	}

	if (
		!isValidDate(warning.detectedAt) ||
		!isValidDate(warning.createdAt) ||
		!isValidDate(warning.updatedAt)
	) {
		return duplicateWarningInvalid("invalid_timestamp");
	}

	if (warning.updatedAt.getTime() < warning.createdAt.getTime()) {
		return duplicateWarningInvalid("updated_at_before_created_at");
	}

	if (warning.matchingSignals.length === 0) {
		return duplicateWarningInvalid("matching_signal_required");
	}

	const uniqueSignals = new Set(warning.matchingSignals);
	if (uniqueSignals.size !== warning.matchingSignals.length) {
		return duplicateWarningInvalid("duplicate_matching_signal");
	}

	const forbiddenSignals = warning.matchingSignals.filter(
		(signal) => !isDuplicateMatchingSignalAllowed(warning.entityType, signal),
	);
	if (forbiddenSignals.length > 0) {
		return governanceFieldsForbidden({
			policyId: `duplicate_warning.${warning.entityType}`,
			fields: forbiddenSignals,
		});
	}

	const hasReviewer = warning.reviewedBy !== null;
	const hasReviewedAt = warning.reviewedAt !== null;
	if (hasReviewer !== hasReviewedAt) {
		return duplicateWarningInvalid("review_actor_timestamp_mismatch");
	}

	if (warning.reviewedAt !== null && !isValidDate(warning.reviewedAt)) {
		return duplicateWarningInvalid("invalid_reviewed_at");
	}

	if (
		warning.status !== "open" &&
		(warning.reviewedBy === null || warning.reviewedAt === null)
	) {
		return duplicateWarningInvalid("review_evidence_required");
	}

	if (
		(warning.status === "not_duplicate" ||
			warning.status === "resolved" ||
			warning.status === "dismissed") &&
		warning.resolution === null
	) {
		return duplicateWarningInvalid("resolution_required");
	}

	if (
		warning.status === "merge_requested" &&
		warning.relatedChangeRequestId === null
	) {
		return duplicateWarningInvalid("related_change_request_required");
	}

	if (
		warning.relatedChangeRequestId !== null &&
		warning.relatedChangeRequestId.trim().length === 0
	) {
		return duplicateWarningInvalid("invalid_related_change_request_id");
	}

	return ok(true);
}

function isAuthorizedStatus(
	status: string,
): status is MergeAuthorizationStatus {
	return MERGE_AUTHORIZATION_STATUS_SET.has(status);
}

function isNonEmptyIdentifier(value: string): boolean {
	return value.trim().length > 0;
}

function isValidDate(value: Date): boolean {
	return Number.isFinite(value.getTime());
}

function duplicateWarningInvalid(reason: string): Result<never> {
	return governanceDuplicateWarningInvalid({
		operation: "duplicate_warning.validate",
		validationReason: reason,
	});
}

function mergeNotAuthorized(
	warning: Pick<
		DuplicateWarningRecord,
		"id" | "sourceEntityId" | "candidateEntityId"
	>,
): Result<never> {
	return governanceMergeNotAuthorized({
		operation: MERGE_OPERATION,
		duplicateWarningId: warning.id,
		sourceEntityId: warning.sourceEntityId,
		targetEntityId: warning.candidateEntityId,
	});
}
