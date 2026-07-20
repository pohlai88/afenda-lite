import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";

import { auditEntriesToCsv } from "../../src/csv";
import { MAX_AUDIT_EXPORT_ROWS } from "../../src/schemas";
import type { AuditStore } from "../../src/store";
import type {
	AuditEntry,
	AuditExportOptions,
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

/** In-memory AuditStore for Vitest only — not a production export. */
export class MemoryAuditStore implements AuditStore {
	private readonly entries: AuditEntry[] = [];

	async write(entry: AuditWriteInput): Promise<Result<AuditEntry>> {
		const created: AuditEntry = {
			id: randomUUID(),
			organizationId: entry.organizationId,
			actorUserId: entry.actorUserId,
			correlationId: entry.correlationId,
			module: entry.module,
			entity: entry.entity,
			entityId: entry.entityId,
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
	}

	async query(options: AuditQueryOptions): Promise<Result<AuditEntry[]>> {
		const filtered = this.entries
			.filter((entry) => matchesFilter(entry, options))
			.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		const offset = (options.page - 1) * options.pageSize;
		return ok(filtered.slice(offset, offset + options.pageSize));
	}

	async count(options: AuditQueryFilter): Promise<Result<number>> {
		return ok(
			this.entries.filter((entry) => matchesFilter(entry, options)).length,
		);
	}

	async export(options: AuditExportOptions): Promise<Result<string>> {
		const filtered = this.entries
			.filter((entry) => matchesFilter(entry, options))
			.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
			.slice(0, MAX_AUDIT_EXPORT_ROWS);

		if (options.format === "json") {
			return ok(JSON.stringify(filtered, null, 2));
		}
		return ok(auditEntriesToCsv(filtered));
	}

	async purge(options: AuditPurgeOptions): Promise<Result<number>> {
		const before = this.entries.length;
		const kept = this.entries.filter(
			(entry) =>
				entry.organizationId !== options.organizationId ||
				entry.createdAt >= options.olderThan,
		);
		this.entries.length = 0;
		this.entries.push(...kept);
		return ok(before - kept.length);
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
