import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

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
	ReliabilityWorkItem,
} from "./types";

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
		correlationId: string;
		idempotencyKey: string;
		requestFingerprint: string;
	},
	ports: Pick<ReliabilityKernelPorts, "store" | "clock">,
): Promise<Result<ReliabilityWorkItem>> {
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
		...input,
		status: "pending",
		version: 1,
		attemptCount: 0,
		nextAttemptAt: now,
		lastAttemptAt: null,
		lastErrorCode: null,
		lastErrorMessage: null,
		receiptId: null,
		createdAt: now,
		updatedAt: now,
	});
}

export async function executeReliabilityWork(
	input: {
		organizationId: string;
		workItemId: string;
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
	if (current.status !== "pending") return ok(current);
	const now = ports.clock.now();
	if (current.nextAttemptAt && current.nextAttemptAt > now) {
		return fail("CONFLICT", "Reliability retry is not due");
	}
	const attemptCount = current.attemptCount + 1;
	const executed = await ports.executor.execute(current);
	if (executed.ok) {
		return ports.store.commitAttempt({
			expectedVersion: current.version,
			deadLetter: null,
			workItem: {
				...current,
				status: "succeeded",
				version: current.version + 1,
				attemptCount,
				nextAttemptAt: null,
				lastAttemptAt: now,
				lastErrorCode: null,
				lastErrorMessage: null,
				receiptId: executed.data.receiptId,
				updatedAt: now,
			},
		});
	}

	const retryable = ports.failureClassifier.isRetryable(executed);
	const terminal = !retryable || attemptCount >= policy.maxAttempts;
	const deadLetter: ReliabilityDeadLetterRecord | null = terminal
		? {
				id: randomUUID(),
				organizationId: current.organizationId,
				workItemId: current.id,
				connector: current.connector,
				operation: current.operation,
				correlationId: current.correlationId,
				idempotencyKey: current.idempotencyKey,
				requestFingerprint: current.requestFingerprint,
				attemptCount,
				errorCode: executed.code,
				errorMessage: executed.message,
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
			lastErrorCode: executed.code,
			lastErrorMessage: executed.message,
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
