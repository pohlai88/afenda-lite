import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import { resolveReliabilityOperation } from "./operations";
import type {
	ReliabilityClockPort,
	ReliabilityExecutorPort,
	ReliabilityFailureClassifierPort,
	ReliabilityStorePort,
} from "./ports";
import {
	DEFAULT_EXPONENTIAL_RETRY_POLICY,
	type ExponentialRetryPolicy,
	retryDelayMs,
	validateRetryPolicy,
} from "./retry";
import type {
	ConnectorCursor,
	ReliabilityDeadLetterRecord,
	ReliabilityExecutionOutcome,
	ReliabilityWorkItem,
} from "./types";

const RELIABILITY_EXECUTION_FAILED_MESSAGE =
	"Reliability work execution failed";

export type ReliabilityKernelPorts = {
	store: ReliabilityStorePort;
	clock: ReliabilityClockPort;
	executor: ReliabilityExecutorPort;
	failureClassifier: ReliabilityFailureClassifierPort;
};

export async function registerReliabilityWork(
	input: {
		organizationId: string;
		connector: string;
		operation: string;
		targetType: string;
		targetId: string;
		correlationId: string;
		idempotencyKey: string;
		requestFingerprint: string;
	},
	ports: Pick<ReliabilityKernelPorts, "store" | "clock">,
): Promise<Result<ReliabilityWorkItem>> {
	const definition = resolveReliabilityOperation(input);
	if (definition === null || input.targetId.trim().length === 0) {
		return fail(
			"VALIDATION_ERROR",
			"Unsupported reliability connector, operation, or target",
		);
	}
	const replay = await ports.store.findByIdempotencyKey(input);
	if (!replay.ok) return replay;
	if (replay.data) {
		return replay.data.requestFingerprint === input.requestFingerprint
			? ok(replay.data)
			: fail("CONFLICT", "Reliability idempotency conflict");
	}
	const now = ports.clock.now();
	return ports.store.createWorkItem({
		id: randomUUID(),
		organizationId: input.organizationId,
		connector: definition.connector,
		operation: definition.operation,
		targetType: definition.targetType,
		targetId: input.targetId,
		correlationId: input.correlationId,
		idempotencyKey: input.idempotencyKey,
		requestFingerprint: input.requestFingerprint,
		status: "pending",
		version: 1,
		attemptCount: 0,
		nextAttemptAt: now,
		lastAttemptAt: null,
		lastErrorCode: null,
		lastErrorMessage: null,
		receiptId: null,
		acknowledgementDeadlineAt: null,
		leaseOwner: null,
		leaseExpiresAt: null,
		createdAt: now,
		updatedAt: now,
	});
}

export function claimDueReliabilityWork(
	input: {
		workerId: string;
		now: Date;
		leaseDurationMs: number;
		limit: number;
		perOrganizationLimit: number;
	},
	store: ReliabilityStorePort,
): Promise<Result<readonly ReliabilityWorkItem[]>> {
	if (
		input.workerId.trim().length === 0 ||
		!Number.isInteger(input.leaseDurationMs) ||
		input.leaseDurationMs < 1_000 ||
		!Number.isInteger(input.limit) ||
		input.limit < 1 ||
		!Number.isInteger(input.perOrganizationLimit) ||
		input.perOrganizationLimit < 1 ||
		input.perOrganizationLimit > input.limit
	) {
		return Promise.resolve(
			fail("VALIDATION_ERROR", "Invalid reliability claim"),
		);
	}
	return store.claimDueWork({
		workerId: input.workerId,
		now: input.now,
		leaseExpiresAt: new Date(input.now.getTime() + input.leaseDurationMs),
		limit: input.limit,
		perOrganizationLimit: input.perOrganizationLimit,
	});
}

export async function executeReliabilityWork(
	input: {
		organizationId: string;
		workItemId: string;
		leaseOwner: string;
		policy?: ExponentialRetryPolicy;
	},
	ports: ReliabilityKernelPorts,
): Promise<Result<ReliabilityWorkItem>> {
	const policy = input.policy ?? DEFAULT_EXPONENTIAL_RETRY_POLICY;
	if (!validateRetryPolicy(policy)) {
		return fail("VALIDATION_ERROR", "Invalid exponential retry policy");
	}
	const found = await ports.store.getWorkItem(input);
	if (!found.ok) return found;
	if (!found.data) return fail("NOT_FOUND", "Reliability work item not found");
	const current = found.data;
	if (current.status !== "processing") return ok(current);
	const now = ports.clock.now();
	if (
		current.leaseOwner !== input.leaseOwner ||
		current.leaseExpiresAt === null ||
		current.leaseExpiresAt <= now
	) {
		return fail("CONFLICT", "Reliability work lease is invalid or expired");
	}
	const attemptCount = current.attemptCount + 1;
	const executed = await ports.executor.execute(current);
	const executionResult: Result<ReliabilityExecutionOutcome> =
		executed.ok &&
		(executed.data.receiptId.trim().length === 0 ||
			(executed.data.kind === "accepted" &&
				executed.data.acknowledgementDeadlineAt <= now))
			? fail(
					"INTERNAL_ERROR",
					"Connector returned invalid acknowledgement evidence",
				)
			: executed;
	if (executionResult.ok) {
		return ports.store.commitAttempt({
			expectedVersion: current.version,
			deadLetter: null,
			workItem: {
				...current,
				status:
					executionResult.data.kind === "accepted"
						? "awaiting_acknowledgement"
						: "succeeded",
				version: current.version + 1,
				attemptCount,
				nextAttemptAt: null,
				lastAttemptAt: now,
				lastErrorCode: null,
				lastErrorMessage: null,
				receiptId: executionResult.data.receiptId,
				acknowledgementDeadlineAt:
					executionResult.data.kind === "accepted"
						? executionResult.data.acknowledgementDeadlineAt
						: null,
				leaseOwner: null,
				leaseExpiresAt: null,
				updatedAt: now,
			},
		});
	}

	const retryable = ports.failureClassifier.isRetryable(executionResult);
	const terminal = !retryable || attemptCount >= policy.maxAttempts;
	const deadLetter: ReliabilityDeadLetterRecord | null = terminal
		? {
				id: randomUUID(),
				organizationId: current.organizationId,
				workItemId: current.id,
				connector: current.connector,
				operation: current.operation,
				targetType: current.targetType,
				targetId: current.targetId,
				correlationId: current.correlationId,
				idempotencyKey: current.idempotencyKey,
				requestFingerprint: current.requestFingerprint,
				attemptCount,
				errorCode: executionResult.code,
				errorMessage: RELIABILITY_EXECUTION_FAILED_MESSAGE,
				failedAt: now,
				replayedByWorkItemId: null,
			}
		: null;
	return ports.store.commitAttempt({
		expectedVersion: current.version,
		deadLetter,
		workItem: {
			...current,
			status: terminal ? "dead_lettered" : "pending",
			version: current.version + 1,
			attemptCount,
			nextAttemptAt: terminal
				? null
				: new Date(now.getTime() + retryDelayMs(policy, attemptCount)),
			lastAttemptAt: now,
			lastErrorCode: executionResult.code,
			lastErrorMessage: RELIABILITY_EXECUTION_FAILED_MESSAGE,
			receiptId: null,
			acknowledgementDeadlineAt: null,
			leaseOwner: null,
			leaseExpiresAt: null,
			updatedAt: now,
		},
	});
}

export async function acknowledgeReliabilityWork(
	input: {
		organizationId: string;
		workItemId: string;
		receiptId: string;
		expectedVersion: number;
		outcome: "acknowledged" | "rejected";
		errorCode?: string;
		errorMessage?: string;
	},
	ports: Pick<ReliabilityKernelPorts, "store" | "clock">,
): Promise<Result<ReliabilityWorkItem>> {
	const found = await ports.store.getWorkItem(input);
	if (!found.ok) return found;
	if (found.data === null)
		return fail("NOT_FOUND", "Reliability work item not found");
	const current = found.data;
	if (current.receiptId !== input.receiptId) {
		return fail("CONFLICT", "Reliability acknowledgement receipt mismatch");
	}
	if (current.status === "succeeded" && input.outcome === "acknowledged") {
		return ok(current);
	}
	if (current.status !== "awaiting_acknowledgement") {
		return fail("CONFLICT", "Reliability work is not awaiting acknowledgement");
	}
	if (current.version !== input.expectedVersion) {
		return fail("CONFLICT", "Reliability acknowledgement version is stale");
	}
	const now = ports.clock.now();
	if (
		current.acknowledgementDeadlineAt !== null &&
		current.acknowledgementDeadlineAt <= now
	) {
		return fail("CONFLICT", "Reliability acknowledgement deadline expired");
	}
	const rejected = input.outcome === "rejected";
	return ports.store.commitAttempt({
		expectedVersion: current.version,
		deadLetter: null,
		workItem: {
			...current,
			status: rejected ? "pending" : "succeeded",
			version: current.version + 1,
			nextAttemptAt: rejected ? now : null,
			lastErrorCode: rejected ? (input.errorCode ?? "CONFLICT") : null,
			lastErrorMessage: rejected
				? (input.errorMessage ?? "Connector rejected accepted work")
				: null,
			acknowledgementDeadlineAt: null,
			updatedAt: now,
		},
	});
}

export async function replayDeadLetter(
	input: {
		organizationId: string;
		deadLetterId: string;
		correlationId: string;
		idempotencyKey: string;
		requestFingerprint: string;
	},
	ports: Pick<ReliabilityKernelPorts, "store" | "clock">,
): Promise<Result<ReliabilityWorkItem>> {
	const deadLetter = await ports.store.getDeadLetter(input);
	if (!deadLetter.ok) return deadLetter;
	if (!deadLetter.data)
		return fail("NOT_FOUND", "Reliability dead letter not found");
	if (deadLetter.data.replayedByWorkItemId) {
		const replay = await ports.store.getWorkItem({
			organizationId: input.organizationId,
			workItemId: deadLetter.data.replayedByWorkItemId,
		});
		return replay.ok && replay.data
			? ok(replay.data)
			: fail("CONFLICT", "Dead-letter replay linkage is invalid");
	}
	const replay = await ports.store.findByIdempotencyKey({
		organizationId: input.organizationId,
		connector: deadLetter.data.connector,
		idempotencyKey: input.idempotencyKey,
	});
	if (!replay.ok) return replay;
	if (replay.data) {
		return replay.data.requestFingerprint === input.requestFingerprint
			? ok(replay.data)
			: fail("CONFLICT", "Reliability idempotency conflict");
	}
	const now = ports.clock.now();
	return ports.store.createDeadLetterReplay({
		deadLetterId: input.deadLetterId,
		workItem: {
			id: randomUUID(),
			organizationId: input.organizationId,
			connector: deadLetter.data.connector,
			operation: deadLetter.data.operation,
			targetType: deadLetter.data.targetType,
			targetId: deadLetter.data.targetId,
			correlationId: input.correlationId,
			idempotencyKey: input.idempotencyKey,
			requestFingerprint: input.requestFingerprint,
			status: "pending",
			version: 1,
			attemptCount: 0,
			nextAttemptAt: now,
			lastAttemptAt: null,
			lastErrorCode: null,
			lastErrorMessage: null,
			receiptId: null,
			acknowledgementDeadlineAt: null,
			leaseOwner: null,
			leaseExpiresAt: null,
			createdAt: now,
			updatedAt: now,
		},
	});
}

export async function recoverConnectorCursor(
	input: { organizationId: string; connector: string; stream: string },
	store: ReliabilityStorePort,
): Promise<Result<ConnectorCursor | null>> {
	return store.getCursor(input);
}

export async function checkpointConnectorCursor(
	input: {
		organizationId: string;
		connector: string;
		stream: string;
		cursor: string;
		expectedVersion: number | null;
	},
	ports: Pick<ReliabilityKernelPorts, "store" | "clock">,
): Promise<Result<ConnectorCursor>> {
	return ports.store.commitCursor({
		expectedVersion: input.expectedVersion,
		cursor: {
			organizationId: input.organizationId,
			connector: input.connector,
			stream: input.stream,
			cursor: input.cursor,
			version: (input.expectedVersion ?? 0) + 1,
			updatedAt: ports.clock.now(),
		},
	});
}
