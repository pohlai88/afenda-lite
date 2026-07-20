import { fail, ok, type Result } from "@afenda/errors/result";

import { createDrizzleAuditStore } from "./drizzle-store";
import {
	type AuditPage,
	auditExportOptionsSchema,
	auditPageSchema,
	auditPurgeOptionsSchema,
	auditQueryOptionsSchema,
} from "./schemas";
import type { AuditStore } from "./store";
import type { AuditAction, AuditEntry } from "./types";

function resolveStore(store?: AuditStore): AuditStore {
	return store ?? createDrizzleAuditStore();
}

/**
 * Paginated org-scoped audit query with total.
 */
export async function queryAuditLog(
	input: unknown,
	store?: AuditStore,
): Promise<Result<AuditPage>> {
	const parsed = auditQueryOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid audit query input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
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

	return ok(page);
}

/**
 * Entity history — filters entity + entityId at the store (org-scoped).
 */
export async function getEntityHistory(
	input: {
		organizationId: string;
		entity: string;
		entityId: string;
		page?: number;
		pageSize?: number;
	},
	store?: AuditStore,
): Promise<Result<AuditPage>> {
	return queryAuditLog(
		{
			organizationId: input.organizationId,
			entity: input.entity,
			entityId: input.entityId,
			page: input.page,
			pageSize: input.pageSize,
		},
		store,
	);
}

/**
 * Actor activity within an organization.
 */
export async function getUserActivity(
	input: {
		organizationId: string;
		actorUserId: string;
		page?: number;
		pageSize?: number;
	},
	store?: AuditStore,
): Promise<Result<AuditPage>> {
	return queryAuditLog(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			page: input.page,
			pageSize: input.pageSize,
		},
		store,
	);
}

/**
 * Count rows for one action within an organization (and optional filters).
 */
export async function countByAction(
	input: {
		organizationId: string;
		action: AuditAction;
		module?: string;
		from?: Date;
		to?: Date;
	},
	store?: AuditStore,
): Promise<Result<number>> {
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
		return fail("BAD_REQUEST", "Invalid audit count input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}

	return resolveStore(store).count(parsed.data);
}

export async function exportAuditLog(
	input: unknown,
	store?: AuditStore,
): Promise<Result<string>> {
	const parsed = auditExportOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid audit export input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}

	return resolveStore(store).export(parsed.data);
}

export async function purgeOldEntries(
	input: unknown,
	store?: AuditStore,
): Promise<Result<number>> {
	const parsed = auditPurgeOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid audit purge input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}

	return resolveStore(store).purge(parsed.data);
}

export type { AuditEntry, AuditPage };
