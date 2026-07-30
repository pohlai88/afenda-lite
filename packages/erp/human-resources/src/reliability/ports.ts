import type { Result } from "@afenda/errors/result";

import type {
	ConnectorCursor,
	ReliabilityDeadLetterRecord,
	ReliabilityExecutionOutcome,
	ReliabilityWorkItem,
} from "./types";

export interface ReliabilityClockPort {
	now: () => Date;
}

export interface ReliabilityExecutorPort {
	/** Must deduplicate by workItemId + requestFingerprint. */
	execute: (
		input: ReliabilityWorkItem,
	) => Promise<Result<ReliabilityExecutionOutcome>>;
}

export interface ReliabilityFailureClassifierPort {
	isRetryable: (failure: { code: string; message: string }) => boolean;
}

export interface ReliabilityStorePort {
	/** Atomically leases due work with per-tenant fairness and expired-lease recovery. */
	claimDueWork: (input: {
		workerId: string;
		now: Date;
		leaseExpiresAt: Date;
		limit: number;
		perOrganizationLimit: number;
	}) => Promise<Result<readonly ReliabilityWorkItem[]>>;
	/** Atomically commits the work update and optional dead-letter insert. */
	commitAttempt: (input: {
		expectedVersion: number;
		workItem: ReliabilityWorkItem;
		deadLetter: ReliabilityDeadLetterRecord | null;
	}) => Promise<Result<ReliabilityWorkItem>>;
	commitCursor: (input: {
		expectedVersion: number | null;
		cursor: ConnectorCursor;
	}) => Promise<Result<ConnectorCursor>>;
	/** Atomically creates replay work and links the terminal dead letter. */
	createDeadLetterReplay: (input: {
		deadLetterId: string;
		workItem: ReliabilityWorkItem;
	}) => Promise<Result<ReliabilityWorkItem>>;
	createWorkItem: (
		item: ReliabilityWorkItem,
	) => Promise<Result<ReliabilityWorkItem>>;
	findByIdempotencyKey: (input: {
		organizationId: string;
		connector: string;
		idempotencyKey: string;
	}) => Promise<Result<ReliabilityWorkItem | null>>;
	findDeadLetterByWorkItem: (input: {
		organizationId: string;
		workItemId: string;
	}) => Promise<Result<ReliabilityDeadLetterRecord | null>>;
	getCursor: (input: {
		organizationId: string;
		connector: string;
		stream: string;
	}) => Promise<Result<ConnectorCursor | null>>;
	getDeadLetter: (input: {
		organizationId: string;
		deadLetterId: string;
	}) => Promise<Result<ReliabilityDeadLetterRecord | null>>;
	getWorkItem: (input: {
		organizationId: string;
		workItemId: string;
	}) => Promise<Result<ReliabilityWorkItem | null>>;
}

export interface ReliabilityTransactionRecoveryContract {
	atomicAttemptAndDeadLetter: true;
	compareAndSwapVersions: true;
	uniqueIdempotencyBoundary: readonly [
		"organizationId",
		"connector",
		"idempotencyKey",
	];
}

export const RELIABILITY_TRANSACTION_RECOVERY_CONTRACT = {
	atomicAttemptAndDeadLetter: true,
	compareAndSwapVersions: true,
	uniqueIdempotencyBoundary: ["organizationId", "connector", "idempotencyKey"],
} as const satisfies ReliabilityTransactionRecoveryContract;
