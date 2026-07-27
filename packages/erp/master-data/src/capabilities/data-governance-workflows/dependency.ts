/**
 * # Store Boundaries
 *
 * Recommended capability contracts:
 *
 * ```ts
 * interface ChangeRequestStore {}
 * interface ImportBatchStore {}
 * interface DuplicateWarningStore {}
 * interface MergeGovernanceStore {}
 * ```
 *
 * Public commands should depend on the smallest required interface.
 *
 * Production implementations must preserve the authoritative transaction contract.
 * Adapters must not recreate workflows through raw table mutations.
 */
import type { Result } from "@afenda/errors/result";

import type { ChangeRequestApplyGateInput } from "./change-request-apply";
import type { ChangeRequestRecord } from "./change-request-types";
import type { ApprovedMergeAuthorization } from "./duplicate-policy";
import type {
	DuplicateWarningRecord,
	DuplicateWarningResolution,
} from "./duplicate-warning";
import type { GovernanceEventPayload } from "./governance-events";
import type { ImportBatchCounters, ImportRowEvidence } from "./import-types";

export type GovernanceTransactionContext = Readonly<{
	correlationId: string;
}>;

export interface ChangeRequestStore {
	getChangeRequestForUpdate(input: {
		organizationId: string;
		changeRequestId: string;
	}): Promise<Result<ChangeRequestRecord | null>>;
	transitionApprovedRequestToApplied(
		input: ChangeRequestApplyGateInput & {
			organizationId: string;
			requestId: string;
			appliedBy: string;
		},
		context: GovernanceTransactionContext,
	): Promise<Result<ChangeRequestRecord>>;
	recordChangeRequestTransition(
		input: {
			request: ChangeRequestRecord;
			event: GovernanceEventPayload;
		},
		context: GovernanceTransactionContext,
	): Promise<Result<ChangeRequestRecord>>;
}

export interface ImportBatchStore {
	getImportRowByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<ImportRowEvidence | null>>;
	recordImportRowOutcome(
		input: {
			row: ImportRowEvidence;
			counters: ImportBatchCounters;
			event: GovernanceEventPayload;
		},
		context: GovernanceTransactionContext,
	): Promise<Result<ImportRowEvidence>>;
}

export interface DuplicateWarningStore {
	recordDuplicateWarning(
		input: DuplicateWarningRecord,
		context: GovernanceTransactionContext,
	): Promise<Result<DuplicateWarningRecord>>;
	reviewDuplicateWarning(
		input: {
			organizationId: string;
			duplicateWarningId: string;
			expectedVersion: number;
			reviewedBy: string;
			resolution: DuplicateWarningResolution;
			resolutionNote: string | null;
			relatedChangeRequestId: string | null;
		},
		context: GovernanceTransactionContext,
	): Promise<Result<DuplicateWarningRecord>>;
}

export interface MergeGovernanceStore {
	findMergeAuthorization(input: {
		organizationId: string;
		mergeRequestId: string;
	}): Promise<Result<ApprovedMergeAuthorization | null>>;
	recordMergeAuthorization(
		input: ApprovedMergeAuthorization & { event: GovernanceEventPayload },
		context: GovernanceTransactionContext,
	): Promise<Result<ApprovedMergeAuthorization>>;
}
