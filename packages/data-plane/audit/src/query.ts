import { errorResult, type Result } from "@afenda/errors";
import { auditEntriesToCsv } from "./csv";
import { decodeAuditCursor, encodeAuditCursor } from "./cursor";
import { createDrizzleAuditStore } from "./drizzle-store";
import {
	type AuditCursorPage,
	type AuditPage,
	auditCursorPageSchema,
	auditCursorQueryInputSchema,
	auditDetailedExportOptionsSchema,
	auditPageSchema,
	auditPurgeOptionsSchema,
	auditQueryOptionsSchema,
	MAX_AUDIT_EXPORT_ROWS,
} from "./schemas";
import type { AuditStore } from "./store";
import { observeAuditOperation } from "./telemetry";
import type { AuditAction, AuditExportResult } from "./types";

function resolveStore(store?: AuditStore): AuditStore {
	return store ?? createDrizzleAuditStore();
}

function onPromiseBoundary<T>(operation: () => T | PromiseLike<T>): Promise<T> {
	return Promise.resolve().then(operation);
}

/**
 * Paginated org-scoped audit query with total.
 */
export function queryAuditLog(
	input: unknown,
	store?: AuditStore,
): Promise<Result<AuditPage>> {
	return observeAuditOperation(
		"query",
		async () => {
			const parsed = auditQueryOptionsSchema.safeParse(input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Invalid audit query input",
				});
			}

			const options = parsed.data;
			const resolved = resolveStore(store);

			const [entriesResult, totalResult] = await Promise.all([
				resolved.query(options),
				resolved.count(options),
			]);

			if (!entriesResult.ok) {
				return entriesResult;
			}
			if (!totalResult.ok) {
				return totalResult;
			}

			const page = auditPageSchema.parse({
				entries: entriesResult.data,
				total: totalResult.data,
				page: options.page,
				pageSize: options.pageSize,
			});

			return errorResult.ok(page);
		},
		(page) => ({ rowCount: page.entries.length }),
	);
}

/**
 * Stable keyset pagination ordered by recorded time and audit id.
 * No total count is returned because a separate count cannot share a snapshot.
 */
export function queryAuditLogCursor(
	input: unknown,
	store?: AuditStore,
): Promise<Result<AuditCursorPage>> {
	return observeAuditOperation(
		"cursor_query",
		async () => {
			const parsed = auditCursorQueryInputSchema.safeParse(input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Invalid audit cursor query input",
				});
			}

			const { cursor: encodedCursor, ...options } = parsed.data;
			const decodedCursor =
				encodedCursor === undefined
					? undefined
					: decodeAuditCursor(encodedCursor);
			if (decodedCursor !== undefined && !decodedCursor.ok) {
				return decodedCursor;
			}

			const rows = await resolveStore(store).queryCursor({
				...options,
				...(decodedCursor === undefined ? {} : { cursor: decodedCursor.data }),
			});
			if (!rows.ok) {
				return rows;
			}

			const hasMore = rows.data.length > options.pageSize;
			const entries = rows.data.slice(0, options.pageSize);
			const finalEntry = entries.at(-1);
			if (hasMore && finalEntry === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			return errorResult.ok(
				auditCursorPageSchema.parse({
					entries,
					nextCursor:
						hasMore && finalEntry !== undefined
							? encodeAuditCursor(finalEntry)
							: null,
					pageSize: options.pageSize,
				}),
			);
		},
		(page) => ({ rowCount: page.entries.length }),
	);
}

/**
 * Entity history — filters entity + entityId at the store (org-scoped).
 */
export function getEntityHistory(
	input: {
		organizationId: string;
		entity: string;
		entityId: string;
		page?: number;
		pageSize?: number;
	},
	store?: AuditStore,
): Promise<Result<AuditPage>> {
	return onPromiseBoundary(() =>
		queryAuditLog(
			{
				organizationId: input.organizationId,
				entity: input.entity,
				entityId: input.entityId,
				page: input.page,
				pageSize: input.pageSize,
			},
			store,
		),
	);
}

/**
 * Actor activity within an organization.
 */
export function getUserActivity(
	input: {
		organizationId: string;
		actorUserId: string;
		page?: number;
		pageSize?: number;
	},
	store?: AuditStore,
): Promise<Result<AuditPage>> {
	return onPromiseBoundary(() =>
		queryAuditLog(
			{
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				page: input.page,
				pageSize: input.pageSize,
			},
			store,
		),
	);
}

/**
 * Count rows for one action within an organization (and optional filters).
 */
export function countByAction(
	input: {
		organizationId: string;
		action: AuditAction;
		module?: string;
		from?: Date;
		to?: Date;
	},
	store?: AuditStore,
): Promise<Result<number>> {
	return observeAuditOperation(
		"count",
		() => {
			const parsed = auditQueryOptionsSchema.safeParse({
				organizationId: input.organizationId,
				action: input.action,
				module: input.module,
				from: input.from,
				to: input.to,
				page: 1,
				pageSize: 1,
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Invalid audit count input",
				});
			}

			return resolveStore(store).count(parsed.data);
		},
		(rowCount) => ({ rowCount }),
	);
}

export function exportAuditLog(
	input: unknown,
	store?: AuditStore,
): Promise<Result<string>> {
	return onPromiseBoundary(async () => {
		const result = await exportAuditLogDetailed(input, store);
		return result.ok ? errorResult.ok(result.data.content) : result;
	});
}

/**
 * Bounded export with explicit truncation and an opaque continuation cursor.
 * Retains `exportAuditLog` for consumers that require the legacy string result.
 */
export function exportAuditLogDetailed(
	input: unknown,
	store?: AuditStore,
): Promise<Result<AuditExportResult>> {
	return observeAuditOperation(
		"export",
		async () => {
			const parsed = auditDetailedExportOptionsSchema.safeParse(input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Invalid audit export input",
				});
			}

			const { cursor: encodedCursor, format, ...filter } = parsed.data;
			const decodedCursor =
				encodedCursor === undefined
					? undefined
					: decodeAuditCursor(encodedCursor);
			if (decodedCursor !== undefined && !decodedCursor.ok) {
				return decodedCursor;
			}

			const rows = await resolveStore(store).queryCursor({
				...filter,
				...(decodedCursor === undefined ? {} : { cursor: decodedCursor.data }),
				pageSize: MAX_AUDIT_EXPORT_ROWS,
			});
			if (!rows.ok) {
				return rows;
			}

			const truncated = rows.data.length > MAX_AUDIT_EXPORT_ROWS;
			const entries = rows.data.slice(0, MAX_AUDIT_EXPORT_ROWS);
			const finalEntry = entries.at(-1);
			if (truncated && finalEntry === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			return errorResult.ok({
				content:
					format === "json"
						? JSON.stringify(entries, null, 2)
						: auditEntriesToCsv(entries),
				format,
				nextCursor:
					truncated && finalEntry !== undefined
						? encodeAuditCursor(finalEntry)
						: null,
				rowCount: entries.length,
				truncated,
			});
		},
		(result) => ({
			rowCount: result.rowCount,
			truncated: result.truncated,
		}),
	);
}

export function purgeOldEntries(
	input: unknown,
	store?: AuditStore,
): Promise<Result<number>> {
	return observeAuditOperation(
		"purge",
		() => {
			const parsed = auditPurgeOptionsSchema.safeParse(input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Invalid audit purge input",
				});
			}

			return resolveStore(store).purge(parsed.data);
		},
		(rowCount) => ({ rowCount }),
	);
}

export type { AuditCursorPage, AuditPage } from "./schemas";
export type { AuditEntry } from "./types";
