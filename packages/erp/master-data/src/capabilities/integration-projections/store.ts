import type { Result } from "@afenda/errors/result";

import type {
	MasterMutationTransactionContext,
	MasterMutationTransactionExecutor,
} from "./integration/mutation-transaction";
import type { MasterDataOutboxRecord } from "./integration/outbox-record";

export type {
	MasterMutationTransactionContext,
	MasterMutationTransactionExecutor,
};

export type IntegrationMutationTransactionExecutor =
	MasterMutationTransactionExecutor;

export type GetOutboxRecordInput = Readonly<{
	organizationId: string;
	eventId: string;
}>;

export type ClaimAvailableOutboxRecordsInput = Readonly<{
	organizationId: string;
	availableThrough: Date;
	limit: number;
	claimedAt: Date;
}>;

export const OUTBOX_CLAIM_RECOVERY_CODES = [
	"PUBLICATION_CLAIM_EXPIRED",
	"PUBLICATION_WORKER_INTERRUPTED",
] as const;

export type OutboxClaimRecoveryCode =
	(typeof OUTBOX_CLAIM_RECOVERY_CODES)[number];

export type RecoverExpiredPublishingRecordsInput = Readonly<{
	organizationId: string;
	publishingStartedBefore: Date;
	availableAt: Date;
	recoveredAt: Date;
	limit: number;
	errorCode: OutboxClaimRecoveryCode;
}>;

export interface OutboxPublicationStore {
	getOutboxRecord(
		input: GetOutboxRecordInput,
	): Promise<Result<MasterDataOutboxRecord | null>>;

	/**
	 * Atomically claims eligible records for publication.
	 *
	 * Eligible records are pending records with availableAt <= availableThrough.
	 * Implementations must order by availableAt, occurredAt, then eventId
	 * ascending before applying the limit, transition claimed records to
	 * publishing, increment attemptCount, set lastAttemptAt to claimedAt, clear
	 * lastErrorCode, and prevent concurrent workers from claiming the same row.
	 */
	claimAvailableOutboxRecords(
		input: ClaimAvailableOutboxRecordsInput,
	): Promise<Result<readonly MasterDataOutboxRecord[]>>;

	/**
	 * Recovers abandoned publication claims.
	 *
	 * Implementations must select publishing records whose lastAttemptAt is at
	 * or before publishingStartedBefore, transition them to retryable_failed,
	 * set lastErrorCode to errorCode, set availableAt for the next retry, and
	 * return records ordered by lastAttemptAt then eventId ascending.
	 */
	recoverExpiredPublishingRecords(
		input: RecoverExpiredPublishingRecordsInput,
	): Promise<Result<readonly MasterDataOutboxRecord[]>>;
}

export type RequeueRetryableFailedOutboxRecordInput = Readonly<{
	organizationId: string;
	eventId: string;
	availableAt: Date;
	reasonCode: string;
	requestedBy: string;
	requeuedAt: Date;
}>;

export interface OutboxReplayStore {
	getOutboxRecord(
		input: GetOutboxRecordInput,
	): Promise<Result<MasterDataOutboxRecord | null>>;

	/**
	 * Administrative replay for retryable failures only.
	 *
	 * Implementations must transition retryable_failed records to pending,
	 * update availableAt, preserve the original eventId, and reject published,
	 * publishing, pending, or dead_lettered records.
	 */
	requeueRetryableFailedOutboxRecord(
		input: RequeueRetryableFailedOutboxRecordInput,
	): Promise<Result<MasterDataOutboxRecord>>;
}
