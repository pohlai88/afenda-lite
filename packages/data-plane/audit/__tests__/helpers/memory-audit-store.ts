import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";

import type { AuditStore } from "../../src/store";
import type {
	AuditCursorQueryOptions,
	AuditEntry,
	AuditPurgeOptions,
	AuditQueryFilter,
	AuditQueryOptions,
	AuditWriteInput,
} from "../../src/types";

function matchesFilter(entry: AuditEntry, filter: AuditQueryFilter): boolean {
	if (entry.organizationId !== filter.organizationId) {
		return false;
	}
	if (filter.module !== undefined && entry.module !== filter.module) {
		return false;
	}
	if (filter.entity !== undefined && entry.entity !== filter.entity) {
		return false;
	}
	if (filter.entityId !== undefined && entry.entityId !== filter.entityId) {
		return false;
	}
	if (
		filter.actorUserId !== undefined &&
		entry.actorUserId !== filter.actorUserId
	) {
		return false;
	}
	if (filter.action !== undefined && entry.action !== filter.action) {
		return false;
	}
	if (
		filter.correlationId !== undefined &&
		entry.correlationId !== filter.correlationId
	) {
		return false;
	}
	if (filter.from !== undefined && entry.createdAt < filter.from) {
		return false;
	}
	if (filter.to !== undefined && entry.createdAt > filter.to) {
		return false;
	}
	return true;
}

function compareNewestFirst(a: AuditEntry, b: AuditEntry): number {
	const timeDifference = b.createdAt.getTime() - a.createdAt.getTime();
	return timeDifference === 0 ? b.id.localeCompare(a.id) : timeDifference;
}

function onPromiseBoundary<T>(operation: () => T): Promise<T> {
	return Promise.resolve().then(operation);
}

/** In-memory AuditStore for Vitest only — not a production export. */
export class MemoryAuditStore implements AuditStore {
	private readonly entries: AuditEntry[] = [];

	write(
		entry: AuditWriteInput & { createdAt?: Date },
	): Promise<Result<AuditEntry>> {
		return onPromiseBoundary(() => {
			const created: AuditEntry = {
				id: randomUUID(),
				organizationId: entry.organizationId,
				actorUserId: entry.actorUserId,
				correlationId: entry.correlationId,
				module: entry.module,
				entity: entry.entity,
				entityId: entry.entityId,
				eventContext: entry.eventContext ?? null,
				action: entry.action,
				changes: entry.changes,
				oldValue: entry.oldValue ?? null,
				newValue: entry.newValue ?? null,
				metadata: entry.metadata ?? null,
				ipAddress: entry.ipAddress ?? null,
				userAgent: entry.userAgent ?? null,
				createdAt: entry.createdAt ?? new Date(),
			};
			this.entries.push(created);
			return ok(created);
		});
	}

	query(options: AuditQueryOptions): Promise<Result<AuditEntry[]>> {
		return onPromiseBoundary(() => {
			const filtered = this.entries
				.filter((entry) => matchesFilter(entry, options))
				.toSorted(compareNewestFirst);
			const offset = (options.page - 1) * options.pageSize;
			return ok(filtered.slice(offset, offset + options.pageSize));
		});
	}

	queryCursor(options: AuditCursorQueryOptions): Promise<Result<AuditEntry[]>> {
		return onPromiseBoundary(() => {
			const filtered = this.entries
				.filter((entry) => matchesFilter(entry, options))
				.filter((entry) => {
					if (options.cursor === undefined) {
						return true;
					}
					const timeDifference =
						entry.createdAt.getTime() - options.cursor.createdAt.getTime();
					return (
						timeDifference < 0 ||
						(timeDifference === 0 && entry.id < options.cursor.id)
					);
				})
				.toSorted(compareNewestFirst);
			return ok(filtered.slice(0, options.pageSize + 1));
		});
	}

	count(options: AuditQueryFilter): Promise<Result<number>> {
		return onPromiseBoundary(() =>
			ok(this.entries.filter((entry) => matchesFilter(entry, options)).length),
		);
	}

	purge(options: AuditPurgeOptions): Promise<Result<number>> {
		return onPromiseBoundary(() => {
			const before = this.entries.length;
			const kept = this.entries.filter(
				(entry) =>
					entry.organizationId !== options.organizationId ||
					entry.createdAt >= options.olderThan,
			);
			this.entries.length = 0;
			this.entries.push(...kept);
			return ok(before - kept.length);
		});
	}

	/** Test inspection — not part of AuditStore. */
	all(): readonly AuditEntry[] {
		return this.entries;
	}
}

export function assertOk<T>(result: Result<T>): T {
	if (!result.ok) {
		throw new Error(`expected ok, got ${result.code}: ${result.message}`);
	}
	return result.data;
}
