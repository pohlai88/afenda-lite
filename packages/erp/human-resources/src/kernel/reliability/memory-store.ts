import { errorResult } from "@afenda/errors";

import type { ReliabilityStorePort } from "./ports";
import type {
	ConnectorCursor,
	ReliabilityDeadLetterRecord,
	ReliabilityWorkItem,
} from "./types";

const clone = <T>(value: T): T => structuredClone(value);
const idempotencyKey = (item: {
	organizationId: string;
	connector: string;
	idempotencyKey: string;
}) => `${item.organizationId}:${item.connector}:${item.idempotencyKey}`;
const cursorKey = (cursor: {
	organizationId: string;
	connector: string;
	stream: string;
}) => `${cursor.organizationId}:${cursor.connector}:${cursor.stream}`;

function runSynchronousMemoryOperation<T>(operation: () => T): Promise<T> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}

export function createMemoryReliabilityStore(): ReliabilityStorePort {
	const workItems = new Map<string, ReliabilityWorkItem>();
	const idempotency = new Map<string, string>();
	const deadLetters = new Map<string, ReliabilityDeadLetterRecord>();
	const cursors = new Map<string, ConnectorCursor>();

	return {
		findByIdempotencyKey(input) {
			return runSynchronousMemoryOperation(() => {
				const id = idempotency.get(idempotencyKey(input));
				const item = id ? workItems.get(id) : undefined;
				return errorResult.ok(item ? clone(item) : null);
			});
		},
		getWorkItem(input) {
			return runSynchronousMemoryOperation(() => {
				const item = workItems.get(input.workItemId);
				return errorResult.ok(
					item?.organizationId === input.organizationId ? clone(item) : null,
				);
			});
		},
		createWorkItem(item) {
			return runSynchronousMemoryOperation(() => {
				const key = idempotencyKey(item);
				if (workItems.has(item.id) || idempotency.has(key)) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				workItems.set(item.id, clone(item));
				idempotency.set(key, item.id);
				return errorResult.ok(clone(item));
			});
		},
		claimDueWork(input) {
			return runSynchronousMemoryOperation(() => {
				const claimed: ReliabilityWorkItem[] = [];
				const perOrganization = new Map<string, number>();
				const eligible = Array.from(workItems.values())
					.filter(
						(item) =>
							(item.status === "pending" &&
								(item.nextAttemptAt === null ||
									item.nextAttemptAt <= input.now)) ||
							(item.status === "processing" &&
								item.leaseExpiresAt !== null &&
								item.leaseExpiresAt <= input.now) ||
							(item.status === "awaiting_acknowledgement" &&
								item.acknowledgementDeadlineAt !== null &&
								item.acknowledgementDeadlineAt <= input.now),
					)
					.sort((left, right) => {
						const due =
							(
								left.nextAttemptAt ??
								left.acknowledgementDeadlineAt ??
								left.createdAt
							).getTime() -
							(
								right.nextAttemptAt ??
								right.acknowledgementDeadlineAt ??
								right.createdAt
							).getTime();
						return due === 0 ? left.id.localeCompare(right.id) : due;
					});
				for (const item of eligible) {
					if (claimed.length >= input.limit) {
						break;
					}
					const organizationCount =
						perOrganization.get(item.organizationId) ?? 0;
					if (organizationCount >= input.perOrganizationLimit) {
						continue;
					}
					const leased: ReliabilityWorkItem = {
						...item,
						status: "processing",
						version: item.version + 1,
						leaseOwner: input.workerId,
						leaseExpiresAt: input.leaseExpiresAt,
						receiptId:
							item.status === "awaiting_acknowledgement"
								? null
								: item.receiptId,
						acknowledgementDeadlineAt: null,
						updatedAt: input.now,
					};
					workItems.set(item.id, clone(leased));
					claimed.push(clone(leased));
					perOrganization.set(item.organizationId, organizationCount + 1);
				}
				return errorResult.ok(claimed);
			});
		},
		commitAttempt(input) {
			return runSynchronousMemoryOperation(() => {
				const current = workItems.get(input.workItem.id);
				if (
					!current ||
					current.version !== input.expectedVersion ||
					input.workItem.version !== current.version + 1 ||
					current.organizationId !== input.workItem.organizationId
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				if (input.deadLetter && deadLetters.has(input.deadLetter.id)) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				workItems.set(current.id, clone(input.workItem));
				if (input.deadLetter) {
					deadLetters.set(input.deadLetter.id, clone(input.deadLetter));
				}
				return errorResult.ok(clone(input.workItem));
			});
		},
		getDeadLetter(input) {
			return runSynchronousMemoryOperation(() => {
				const record = deadLetters.get(input.deadLetterId);
				return errorResult.ok(
					record?.organizationId === input.organizationId
						? clone(record)
						: null,
				);
			});
		},
		findDeadLetterByWorkItem(input) {
			return runSynchronousMemoryOperation(() => {
				const record = Array.from(deadLetters.values()).find(
					(candidate) =>
						candidate.organizationId === input.organizationId &&
						candidate.workItemId === input.workItemId,
				);
				return errorResult.ok(record ? clone(record) : null);
			});
		},
		createDeadLetterReplay(input) {
			return runSynchronousMemoryOperation(() => {
				const deadLetter = deadLetters.get(input.deadLetterId);
				const key = idempotencyKey(input.workItem);
				if (
					!deadLetter ||
					deadLetter.organizationId !== input.workItem.organizationId
				) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
					});
				}
				if (deadLetter.replayedByWorkItemId) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				if (workItems.has(input.workItem.id) || idempotency.has(key)) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				workItems.set(input.workItem.id, clone(input.workItem));
				idempotency.set(key, input.workItem.id);
				deadLetters.set(deadLetter.id, {
					...clone(deadLetter),
					replayedByWorkItemId: input.workItem.id,
				});
				return errorResult.ok(clone(input.workItem));
			});
		},
		getCursor(input) {
			return runSynchronousMemoryOperation(() => {
				const cursor = cursors.get(cursorKey(input));
				return errorResult.ok(cursor ? clone(cursor) : null);
			});
		},
		commitCursor(input) {
			return runSynchronousMemoryOperation(() => {
				const key = cursorKey(input.cursor);
				const current = cursors.get(key);
				if (
					(current === undefined && input.expectedVersion !== null) ||
					(current !== undefined &&
						current.version !== input.expectedVersion) ||
					input.cursor.version !== (current?.version ?? 0) + 1
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				cursors.set(key, clone(input.cursor));
				return errorResult.ok(clone(input.cursor));
			});
		},
	};
}
