import { errorResult, type Result } from "@afenda/errors";

import { assertDistinctMergeParticipants } from "../lifecycle-governance";
import {
	governanceMergeNotAuthorized,
	governancePermissionRequired,
	governanceVersionConflict,
} from "./governance-errors";
import {
	type MergeConflictResolution,
	validateMergeConflictResolutions,
} from "./merge-conflicts";
import type { GovernancePermission } from "./permissions";

const PARTY_MERGE_OPERATION = "party.merge" as const;
const PARTY_MERGE_PERMISSION =
	"master_data.party_merge" as const satisfies GovernancePermission;

export type ApprovedMergeRequestEvidence = Readonly<{
	id: string;
	organizationId: string;
	status: "approved";
	sourceEntityId: string;
	survivingEntityId: string;
	sourceExpectedVersion: number;
	targetExpectedVersion: number;
	workflowVersion: number;
	expiresAt: Date | null;
	supersededAt: Date | null;
	appliedAt: Date | null;
}>;

export type MergeParticipantEvidence = Readonly<{
	id: string;
	organizationId: string;
	version: number;
	lifecycleState: string;
	mergedIntoId: string | null;
}>;

export type MergeReasonEvidence =
	| Readonly<{
			kind: "duplicate_warning";
			duplicateWarningId: string;
	  }>
	| Readonly<{
			kind: "manual_reason";
			reasonCode: string;
			reasonNote: string;
	  }>;

export type MergeAuthorizationInput = Readonly<{
	organizationId: string;
	actorUserId: string;
	now: Date;
	hasMergePermission: boolean;
	expectedWorkflowVersion: number;
	approvedRequest: ApprovedMergeRequestEvidence | null;
	source: MergeParticipantEvidence;
	target: MergeParticipantEvidence;
	lifecycleCompatibility: Readonly<{
		compatible: boolean;
		reasonCode: string | null;
	}>;
	canonicalTargetDecision: Readonly<{
		selectedTargetId: string;
		reasonCode: string;
	}>;
	reasonEvidence: MergeReasonEvidence | null;
	conflictResolutions: readonly MergeConflictResolution[];
	sourceMergeChain: readonly string[];
	targetMergeChain: readonly string[];
}>;

export function assertMergeAuthorized(
	input: MergeAuthorizationInput,
): Result<true> {
	const distinct = assertDistinctMergeParticipants(
		input.source.id,
		input.target.id,
	);
	if (!distinct.ok) {
		return distinct;
	}

	if (!input.hasMergePermission) {
		return governancePermissionRequired({
			operation: PARTY_MERGE_OPERATION,
			requiredPermission: PARTY_MERGE_PERMISSION,
		});
	}

	const request = input.approvedRequest;
	if (request === null) {
		return mergeNotAuthorized(input);
	}

	const requestValidation = validateMergeRequest(input, request);
	if (!requestValidation.ok) {
		return requestValidation;
	}

	const versionValidation = validateMergeVersions(input, request);
	if (!versionValidation.ok) {
		return versionValidation;
	}

	return validateMergeDomainConstraints(input, request);
}

function validateMergeRequest(
	input: MergeAuthorizationInput,
	request: ApprovedMergeRequestEvidence,
): Result<true> {
	if (
		!(
			isNonEmptyIdentifier(input.organizationId) &&
			isNonEmptyIdentifier(input.actorUserId) &&
			isValidDate(input.now)
		)
	) {
		return mergeNotAuthorized(input, request.id);
	}

	if (
		request.organizationId !== input.organizationId ||
		input.source.organizationId !== input.organizationId ||
		input.target.organizationId !== input.organizationId
	) {
		return mergeNotAuthorized(input, request.id);
	}

	if (
		request.sourceEntityId !== input.source.id ||
		request.survivingEntityId !== input.target.id
	) {
		return mergeNotAuthorized(input, request.id);
	}

	if (
		request.supersededAt !== null ||
		request.appliedAt !== null ||
		(request.expiresAt !== null &&
			(!isValidDate(request.expiresAt) ||
				request.expiresAt.getTime() <= input.now.getTime()))
	) {
		return mergeNotAuthorized(input, request.id);
	}

	return errorResult.ok(true);
}

function validateMergeVersions(
	input: MergeAuthorizationInput,
	request: ApprovedMergeRequestEvidence,
): Result<true> {
	if (
		!(
			isPositiveVersion(input.expectedWorkflowVersion) &&
			isPositiveVersion(request.workflowVersion)
		)
	) {
		return mergeNotAuthorized(input, request.id);
	}

	if (request.workflowVersion !== input.expectedWorkflowVersion) {
		return governanceVersionConflict({
			operation: PARTY_MERGE_OPERATION,
			entityId: request.id,
			versionKind: "workflow",
			expectedVersion: input.expectedWorkflowVersion,
			actualVersion: request.workflowVersion,
		});
	}

	if (
		!(
			isPositiveVersion(input.source.version) &&
			isPositiveVersion(request.sourceExpectedVersion)
		)
	) {
		return mergeNotAuthorized(input, request.id);
	}

	if (input.source.version !== request.sourceExpectedVersion) {
		return governanceVersionConflict({
			operation: PARTY_MERGE_OPERATION,
			entityId: input.source.id,
			versionKind: "target",
			expectedVersion: request.sourceExpectedVersion,
			actualVersion: input.source.version,
		});
	}

	if (
		!(
			isPositiveVersion(input.target.version) &&
			isPositiveVersion(request.targetExpectedVersion)
		)
	) {
		return mergeNotAuthorized(input, request.id);
	}

	if (input.target.version !== request.targetExpectedVersion) {
		return governanceVersionConflict({
			operation: PARTY_MERGE_OPERATION,
			entityId: input.target.id,
			versionKind: "target",
			expectedVersion: request.targetExpectedVersion,
			actualVersion: input.target.version,
		});
	}

	return errorResult.ok(true);
}

function validateMergeDomainConstraints(
	input: MergeAuthorizationInput,
	request: ApprovedMergeRequestEvidence,
): Result<true> {
	if (!input.lifecycleCompatibility.compatible) {
		return mergeNotAuthorized(input, request.id);
	}

	if (input.canonicalTargetDecision.selectedTargetId !== input.target.id) {
		return mergeNotAuthorized(input, request.id);
	}

	if (!hasValidReasonEvidence(input.reasonEvidence)) {
		return mergeNotAuthorized(input, request.id);
	}

	const conflictValidation = validateMergeConflictResolutions({
		mergeRequestId: request.id,
		resolutions: input.conflictResolutions,
	});
	if (!conflictValidation.ok) {
		return conflictValidation;
	}

	if (
		!isValidMergeChain({
			sourceId: input.source.id,
			targetId: input.target.id,
			sourceMergedIntoId: input.source.mergedIntoId,
			targetMergedIntoId: input.target.mergedIntoId,
			sourceMergeChain: input.sourceMergeChain,
			targetMergeChain: input.targetMergeChain,
		})
	) {
		return mergeNotAuthorized(input, request.id);
	}

	return errorResult.ok(true);
}

function hasValidReasonEvidence(evidence: MergeReasonEvidence | null): boolean {
	if (evidence === null) {
		return false;
	}

	switch (evidence.kind) {
		case "duplicate_warning":
			return isNonEmptyIdentifier(evidence.duplicateWarningId);
		case "manual_reason":
			return (
				evidence.reasonCode.trim().length > 0 &&
				evidence.reasonNote.trim().length > 0
			);
		default:
			return assertNever(evidence);
	}
}

function isValidMergeChain(input: {
	sourceId: string;
	targetId: string;
	sourceMergedIntoId: string | null;
	targetMergedIntoId: string | null;
	sourceMergeChain: readonly string[];
	targetMergeChain: readonly string[];
}): boolean {
	if (input.sourceMergedIntoId !== null || input.targetMergedIntoId !== null) {
		return false;
	}

	const sourceChain = new Set(input.sourceMergeChain);
	const targetChain = new Set(input.targetMergeChain);

	if (
		sourceChain.size !== input.sourceMergeChain.length ||
		targetChain.size !== input.targetMergeChain.length
	) {
		return false;
	}

	if (
		sourceChain.has(input.sourceId) ||
		sourceChain.has(input.targetId) ||
		targetChain.has(input.sourceId) ||
		targetChain.has(input.targetId)
	) {
		return false;
	}

	for (const id of sourceChain) {
		if (targetChain.has(id)) {
			return false;
		}
	}

	return true;
}

function mergeNotAuthorized(
	input: Pick<MergeAuthorizationInput, "organizationId" | "source" | "target">,
	requestId?: string,
): Result<never> {
	return governanceMergeNotAuthorized({
		operation: PARTY_MERGE_OPERATION,
		organizationId: input.organizationId,
		requestId,
		sourceEntityId: input.source.id,
		targetEntityId: input.target.id,
	});
}

function isPositiveVersion(value: number): boolean {
	return Number.isSafeInteger(value) && value >= 1;
}

function isNonEmptyIdentifier(value: string): boolean {
	return value.trim().length > 0;
}

function isValidDate(value: Date): boolean {
	return Number.isFinite(value.getTime());
}

function assertNever(value: never): never {
	throw new Error(`Unsupported merge evidence: ${String(value)}`);
}
