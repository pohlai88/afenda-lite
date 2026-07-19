import {
	and,
	count,
	db,
	desc,
	eq,
	gte,
	lt,
	lte,
	platformAuditLog,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import { auditEntriesToCsv } from "./csv";
import { mapAuditLogRow } from "./map-row";
import { MAX_AUDIT_EXPORT_ROWS } from "./schemas";
import type { AuditStore } from "./store";
import type {
	AuditEntry,
	AuditExportOptions,
	AuditPurgeOptions,
	AuditQueryFilter,
	AuditQueryOptions,
	AuditWriteInput,
} from "./types";

function buildWhere(filter: AuditQueryFilter) {
	const predicates = [
		eq(platformAuditLog.organizationId, filter.organizationId),
	];

	if (filter.module !== undefined) {
		predicates.push(eq(platformAuditLog.module, filter.module));
	}
	if (filter.entity !== undefined) {
		predicates.push(eq(platformAuditLog.entity, filter.entity));
	}
	if (filter.entityId !== undefined) {
		predicates.push(eq(platformAuditLog.entityId, filter.entityId));
	}
	if (filter.actorUserId !== undefined) {
		predicates.push(eq(platformAuditLog.actorUserId, filter.actorUserId));
	}
	if (filter.action !== undefined) {
		predicates.push(eq(platformAuditLog.action, filter.action));
	}
	if (filter.correlationId !== undefined) {
		predicates.push(eq(platformAuditLog.correlationId, filter.correlationId));
	}
	if (filter.from !== undefined) {
		predicates.push(gte(platformAuditLog.createdAt, filter.from));
	}
	if (filter.to !== undefined) {
		predicates.push(lte(platformAuditLog.createdAt, filter.to));
	}

	const where = and(...predicates);
	if (where === undefined) {
		throw new Error("@afenda/audit: audit where clause is required");
	}
	return where;
}

function mapRows(
	rows: Parameters<typeof mapAuditLogRow>[0][],
): Result<AuditEntry[]> {
	const entries: AuditEntry[] = [];
	for (const row of rows) {
		const mapped = mapAuditLogRow(row);
		if (!mapped.ok) {
			return fail(
				"INTERNAL_ERROR",
				`audit row mapping failed: ${mapped.reason}`,
			);
		}
		entries.push(mapped.data);
	}
	return ok(entries);
}

export class DrizzleAuditStore implements AuditStore {
	async write(entry: AuditWriteInput): Promise<Result<AuditEntry>> {
		try {
			const [row] = await db
				.insert(platformAuditLog)
				.values({
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
					createdAt: entry.createdAt,
				})
				.returning();

			if (row === undefined) {
				return fail("INTERNAL_ERROR", "audit write returned no row");
			}

			const mapped = mapAuditLogRow(row);
			if (!mapped.ok) {
				return fail(
					"INTERNAL_ERROR",
					`audit write returned unreadable row: ${mapped.reason}`,
				);
			}

			return ok(mapped.data);
		} catch (error) {
			return failFromUnknown(error, "Failed to write audit entry");
		}
	}

	async query(options: AuditQueryOptions): Promise<Result<AuditEntry[]>> {
		try {
			const where = buildWhere(options);
			const offset = (options.page - 1) * options.pageSize;

			const rows = await db
				.select()
				.from(platformAuditLog)
				.where(where)
				.orderBy(desc(platformAuditLog.createdAt))
				.limit(options.pageSize)
				.offset(offset);

			return mapRows(rows);
		} catch (error) {
			return failFromUnknown(error, "Failed to query audit log");
		}
	}

	async count(options: AuditQueryFilter): Promise<Result<number>> {
		try {
			const where = buildWhere(options);
			const [totalRow] = await db
				.select({ value: count() })
				.from(platformAuditLog)
				.where(where);

			return ok(Number(totalRow?.value ?? 0));
		} catch (error) {
			return failFromUnknown(error, "Failed to count audit entries");
		}
	}

	async export(options: AuditExportOptions): Promise<Result<string>> {
		try {
			const where = buildWhere(options);
			const rows = await db
				.select()
				.from(platformAuditLog)
				.where(where)
				.orderBy(desc(platformAuditLog.createdAt))
				.limit(MAX_AUDIT_EXPORT_ROWS);

			const mapped = mapRows(rows);
			if (!mapped.ok) {
				return mapped;
			}

			if (options.format === "json") {
				return ok(JSON.stringify(mapped.data, null, 2));
			}

			return ok(auditEntriesToCsv(mapped.data));
		} catch (error) {
			return failFromUnknown(error, "Failed to export audit log");
		}
	}

	async purge(options: AuditPurgeOptions): Promise<Result<number>> {
		try {
			const where = and(
				eq(platformAuditLog.organizationId, options.organizationId),
				lt(platformAuditLog.createdAt, options.olderThan),
			);
			if (where === undefined) {
				return fail("INTERNAL_ERROR", "audit purge where clause is required");
			}

			const deleted = await db
				.delete(platformAuditLog)
				.where(where)
				.returning({ id: platformAuditLog.id });

			return ok(deleted.length);
		} catch (error) {
			return failFromUnknown(error, "Failed to purge audit entries");
		}
	}
}

export function createDrizzleAuditStore(): DrizzleAuditStore {
	return new DrizzleAuditStore();
}
