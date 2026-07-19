import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";

import type { EventStore } from "../../src/store";
import type {
	DomainEvent,
	DomainEventClaimOptions,
	DomainEventMarkFailedInput,
	DomainEventMarkProcessedInput,
	DomainEventPurgeOptions,
	DomainEventQueryOptions,
	DomainEventWriteInput,
} from "../../src/types";

function assertOk<T>(result: Result<T>): T {
	if (!result.ok) {
		throw new Error(`expected ok, got ${result.code}: ${result.message}`);
	}
	return result.data;
}

export { assertOk };

/** In-memory EventStore for Vitest only — not a production export. */
export class MemoryEventStore implements EventStore {
	private readonly entries: DomainEvent[] = [];

	all(): DomainEvent[] {
		return [...this.entries];
	}

	async append(entry: DomainEventWriteInput): Promise<Result<DomainEvent>> {
		const created: DomainEvent = {
			id: randomUUID(),
			organizationId: entry.organizationId,
			type: entry.type,
			sourceModule: entry.sourceModule,
			occurredAt: entry.createdAt ?? new Date(),
			correlationId: entry.correlationId,
			causationId: entry.causationId ?? null,
			actorUserId: entry.actorUserId,
			payload: entry.payload,
			metadata: entry.metadata ?? null,
			status: "pending",
			attempts: 0,
			lastError: null,
			processedAt: null,
		};
		this.entries.push(created);
		return ok(created);
	}

	async query(
		options: DomainEventQueryOptions,
	): Promise<Result<DomainEvent[]>> {
		const filtered = this.filter(options).toSorted(
			(a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
		);
		const offset = (options.page - 1) * options.pageSize;
		return ok(filtered.slice(offset, offset + options.pageSize));
	}

	async count(options: DomainEventQueryOptions): Promise<Result<number>> {
		return ok(this.filter(options).length);
	}

	async claimPending(
		options: DomainEventClaimOptions,
	): Promise<Result<DomainEvent[]>> {
		const pending = this.entries
			.filter(
				(entry) =>
					entry.status === "pending" &&
					(options.organizationId === undefined ||
						entry.organizationId === options.organizationId),
			)
			.toSorted((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
		return ok(pending.slice(0, options.limit).map((entry) => ({ ...entry })));
	}

	async markProcessed(
		input: DomainEventMarkProcessedInput,
	): Promise<Result<DomainEvent | null>> {
		const entry = this.entries.find(
			(row) =>
				row.id === input.id && row.organizationId === input.organizationId,
		);
		if (!entry) {
			return ok(null);
		}
		entry.status = "processed";
		entry.processedAt = input.processedAt ?? new Date();
		entry.lastError = null;
		return ok({ ...entry });
	}

	async markFailed(
		input: DomainEventMarkFailedInput,
	): Promise<Result<DomainEvent | null>> {
		const entry = this.entries.find(
			(row) =>
				row.id === input.id && row.organizationId === input.organizationId,
		);
		if (!entry) {
			return ok(null);
		}
		entry.status = "failed";
		entry.attempts += 1;
		entry.lastError = input.lastError;
		return ok({ ...entry });
	}

	async purgeProcessed(
		options: DomainEventPurgeOptions,
	): Promise<Result<number>> {
		const before = this.entries.length;
		const kept = this.entries.filter(
			(entry) =>
				!(
					entry.organizationId === options.organizationId &&
					entry.status === "processed" &&
					entry.occurredAt < options.olderThan
				),
		);
		this.entries.length = 0;
		this.entries.push(...kept);
		return ok(before - kept.length);
	}

	private filter(options: DomainEventQueryOptions): DomainEvent[] {
		return this.entries.filter((entry) => {
			if (entry.organizationId !== options.organizationId) {
				return false;
			}
			if (options.type !== undefined && entry.type !== options.type) {
				return false;
			}
			if (options.status !== undefined && entry.status !== options.status) {
				return false;
			}
			if (
				options.correlationId !== undefined &&
				entry.correlationId !== options.correlationId
			) {
				return false;
			}
			if (options.from !== undefined && entry.occurredAt < options.from) {
				return false;
			}
			if (options.to !== undefined && entry.occurredAt > options.to) {
				return false;
			}
			return true;
		});
	}
}
