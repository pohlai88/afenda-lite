import {
	and,
	count,
	db,
	desc,
	eq,
	gte,
	lt,
	lte,
	or,
	platformAuditLog,
} from "@afenda/db";
import { normalizePostgresUnknown } from "@afenda/errors/adapters/postgres";
import { fail, failFromAppError, ok, type Result } from "@afenda/errors/result";

import { serializeAuditMetadata } from "./event-context";
import { mapAuditLogRow } from "./map-row";
import { prepareAuditWrite } from "./prepare-write";
import type { AuditStore } from "./store";
import type {
	AuditCursorQueryOptions,
	AuditEntry,
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

function buildCursorWhere(options: AuditCursorQueryOptions) {
	const base = buildWhere(options);
	if (options.cursor === undefined) {
		return base;
	}

	const afterCursor = or(
		lt(platformAuditLog.createdAt, options.cursor.createdAt),
		and(
			eq(platformAuditLog.createdAt, options.cursor.createdAt),
			lt(platformAuditLog.id, options.cursor.id),
		),
	);
	if (afterCursor === undefined) {
		throw new Error("@afenda/audit: cursor predicate is required");
	}
	const where = and(base, afterCursor);
	if (where === undefined) {
		throw new Error("@afenda/audit: cursor where clause is required");
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

function failFromPersistence(error: unknown, fallbackMessage: string) {
	return failFromAppError(normalizePostgresUnknown(error, fallbackMessage));
}

export class DrizzleAuditStore implements AuditStore {
	async write(entry: AuditWriteInput): Promise<Result<AuditEntry>> {
		const prepared = prepareAuditWrite(entry);
		if (!prepared.ok) {
			return prepared;
		}
		const validated = prepared.data;

		try {
			const [row] = await db
				.insert(platformAuditLog)
				.values({
					organizationId: validated.organizationId,
					actorUserId: validated.actorUserId,
					correlationId: validated.correlationId,
					module: validated.module,
					entity: validated.entity,
					entityId: validated.entityId,
					action: validated.action,
					changes: validated.changes,
					oldValue: validated.oldValue ?? null,
					newValue: validated.newValue ?? null,
					metadata: serializeAuditMetadata(
						validated.metadata ?? null,
						validated.eventContext,
					),
					ipAddress: validated.ipAddress ?? null,
					userAgent: validated.userAgent ?? null,
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
			return failFromPersistence(error, "Failed to write audit entry");
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
				.orderBy(desc(platformAuditLog.createdAt), desc(platformAuditLog.id))
				.limit(options.pageSize)
				.offset(offset);

			return mapRows(rows);
		} catch (error) {
			return failFromPersistence(error, "Failed to query audit log");
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
			return failFromPersistence(error, "Failed to count audit entries");
		}
	}

	async queryCursor(
		options: AuditCursorQueryOptions,
	): Promise<Result<AuditEntry[]>> {
		try {
			const rows = await db
				.select()
				.from(platformAuditLog)
				.where(buildCursorWhere(options))
				.orderBy(desc(platformAuditLog.createdAt), desc(platformAuditLog.id))
				.limit(options.pageSize + 1);

			return mapRows(rows);
		} catch (error) {
			return failFromPersistence(error, "Failed to query audit cursor page");
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
			return failFromPersistence(error, "Failed to purge audit entries");
		}
	}
}

export function createDrizzleAuditStore(): DrizzleAuditStore {
	return new DrizzleAuditStore();
}
