import type { Result } from "@afenda/errors/result";

import type {
	ConnectorCursor,
	ReliabilityDeadLetterRecord,
	ReliabilityWorkItem,
} from "./types";

export type ReliabilityClockPort = { now(): Date };

export type ReliabilityExecutorPort = {
	/** Must deduplicate by workItemId + requestFingerprint. */
	execute(input: ReliabilityWorkItem): Promise<
		Result<{
			receiptId: string | null;
		}>
	>;
};

export type ReliabilityFailureClassifierPort = {
	isRetryable(failure: { code: string; message: string }): boolean;
};

export type ReliabilityStorePort = {
	findByIdempotencyKey(input: {
		organizationId: string;
		connector: string;
		idempotencyKey: string;
	}): Promise<Result<ReliabilityWorkItem | null>>;
	getWorkItem(input: {
		organizationId: string;
		workItemId: string;
	}): Promise<Result<ReliabilityWorkItem | null>>;
	createWorkItem(
		item: ReliabilityWorkItem,
	): Promise<Result<ReliabilityWorkItem>>;
	/** Atomically commits the work update and optional dead-letter insert. */
	commitAttempt(input: {
		expectedVersion: number;
		workItem: ReliabilityWorkItem;
		deadLetter: ReliabilityDeadLetterRecord | null;
	}): Promise<Result<ReliabilityWorkItem>>;
	getDeadLetter(input: {
		organizationId: string;
		deadLetterId: string;
	}): Promise<Result<ReliabilityDeadLetterRecord | null>>;
	findDeadLetterByWorkItem(input: {
		organizationId: string;
		workItemId: string;
	}): Promise<Result<ReliabilityDeadLetterRecord | null>>;
	/** Atomically creates replay work and links the terminal dead letter. */
	createDeadLetterReplay(input: {
		deadLetterId: string;
		workItem: ReliabilityWorkItem;
	}): Promise<Result<ReliabilityWorkItem>>;
	getCursor(input: {
		organizationId: string;
		connector: string;
		stream: string;
	}): Promise<Result<ConnectorCursor | null>>;
	commitCursor(input: {
		expectedVersion: number | null;
		cursor: ConnectorCursor;
	}): Promise<Result<ConnectorCursor>>;
};

export type ReliabilityTransactionRecoveryContract = {
	atomicAttemptAndDeadLetter: true;
	compareAndSwapVersions: true;
	uniqueIdempotencyBoundary: readonly [
		"organizationId",
		"connector",
		"idempotencyKey",
	];
};

export const RELIABILITY_TRANSACTION_RECOVERY_CONTRACT = {
	atomicAttemptAndDeadLetter: true,
	compareAndSwapVersions: true,
	uniqueIdempotencyBoundary: ["organizationId", "connector", "idempotencyKey"],
} as const satisfies ReliabilityTransactionRecoveryContract;
