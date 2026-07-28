import { fail, ok } from "@afenda/errors/result";

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

export function createMemoryReliabilityStore(): ReliabilityStorePort {
	const workItems = new Map<string, ReliabilityWorkItem>();
	const idempotency = new Map<string, string>();
	const deadLetters = new Map<string, ReliabilityDeadLetterRecord>();
	const cursors = new Map<string, ConnectorCursor>();

	return {
		async findByIdempotencyKey(input) {
			const id = idempotency.get(idempotencyKey(input));
			return ok(id ? clone(workItems.get(id) as ReliabilityWorkItem) : null);
		},
		async getWorkItem(input) {
			const item = workItems.get(input.workItemId);
			return ok(
				item?.organizationId === input.organizationId ? clone(item) : null,
			);
		},
		async createWorkItem(item) {
			const key = idempotencyKey(item);
			if (workItems.has(item.id) || idempotency.has(key)) {
				return fail("CONFLICT", "Reliability work item already exists");
			}
			workItems.set(item.id, clone(item));
			idempotency.set(key, item.id);
			return ok(clone(item));
		},
		async commitAttempt(input) {
			const current = workItems.get(input.workItem.id);
			if (
				!current ||
				current.version !== input.expectedVersion ||
				input.workItem.version !== current.version + 1 ||
				current.organizationId !== input.workItem.organizationId
			) {
				return fail("CONFLICT", "Reliability work item version conflict");
			}
			if (input.deadLetter && deadLetters.has(input.deadLetter.id)) {
				return fail("CONFLICT", "Reliability dead letter already exists");
			}
			workItems.set(current.id, clone(input.workItem));
			if (input.deadLetter) {
				deadLetters.set(input.deadLetter.id, clone(input.deadLetter));
			}
			return ok(clone(input.workItem));
		},
		async getDeadLetter(input) {
			const record = deadLetters.get(input.deadLetterId);
			return ok(
				record?.organizationId === input.organizationId ? clone(record) : null,
			);
		},
		async findDeadLetterByWorkItem(input) {
			const record = Array.from(deadLetters.values()).find(
				(candidate) =>
					candidate.organizationId === input.organizationId &&
					candidate.workItemId === input.workItemId,
			);
			return ok(record ? clone(record) : null);
		},
		async createDeadLetterReplay(input) {
			const deadLetter = deadLetters.get(input.deadLetterId);
			const key = idempotencyKey(input.workItem);
			if (
				!deadLetter ||
				deadLetter.organizationId !== input.workItem.organizationId
			) {
				return fail("NOT_FOUND", "Reliability dead letter not found");
			}
			if (deadLetter.replayedByWorkItemId) {
				return fail("CONFLICT", "Reliability dead letter already replayed");
			}
			if (workItems.has(input.workItem.id) || idempotency.has(key)) {
				return fail("CONFLICT", "Reliability work item already exists");
			}
			workItems.set(input.workItem.id, clone(input.workItem));
			idempotency.set(key, input.workItem.id);
			deadLetters.set(deadLetter.id, {
				...clone(deadLetter),
				replayedByWorkItemId: input.workItem.id,
			});
			return ok(clone(input.workItem));
		},
		async getCursor(input) {
			const cursor = cursors.get(cursorKey(input));
			return ok(cursor ? clone(cursor) : null);
		},
		async commitCursor(input) {
			const key = cursorKey(input.cursor);
			const current = cursors.get(key);
			if (
				(current === undefined && input.expectedVersion !== null) ||
				(current !== undefined && current.version !== input.expectedVersion) ||
				input.cursor.version !== (current?.version ?? 0) + 1
			) {
				return fail("CONFLICT", "Connector cursor version conflict");
			}
			cursors.set(key, clone(input.cursor));
			return ok(clone(input.cursor));
		},
	};
}
