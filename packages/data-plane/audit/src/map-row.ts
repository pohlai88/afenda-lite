import { isPlainObject } from "./differ";
import { changeSchema } from "./schemas";
import type { AuditAction, AuditEntry, Change } from "./types";
import { AUDIT_ACTIONS } from "./types";

const AUDIT_ACTION_SET: ReadonlySet<string> = new Set(AUDIT_ACTIONS);

function isAuditAction(value: string): value is AuditAction {
	return AUDIT_ACTION_SET.has(value);
}

export type MapAuditRowFailure = {
	ok: false;
	reason: "invalid_action" | "invalid_changes" | "invalid_snapshot";
};

export type MapAuditRowSuccess = {
	ok: true;
	data: AuditEntry;
};

export type MapAuditRowResult = MapAuditRowSuccess | MapAuditRowFailure;

function parseChanges(raw: unknown): Change[] | null {
	if (!Array.isArray(raw)) {
		return null;
	}
	const changes: Change[] = [];
	for (const item of raw) {
		const parsed = changeSchema.safeParse(item);
		if (!parsed.success) {
			return null;
		}
		changes.push(parsed.data);
	}
	return changes;
}

function asRecordOrNull(
	value: unknown,
): { ok: true; data: Record<string, unknown> | null } | { ok: false } {
	if (value === null || value === undefined) {
		return { ok: true, data: null };
	}
	if (isPlainObject(value)) {
		return { ok: true, data: value };
	}
	return { ok: false };
}

export function mapAuditLogRow(row: {
	id: string;
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	module: string;
	entity: string;
	entityId: string;
	action: string;
	changes: unknown;
	oldValue: unknown;
	newValue: unknown;
	metadata: unknown;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
}): MapAuditRowResult {
	if (!isAuditAction(row.action)) {
		return { ok: false, reason: "invalid_action" };
	}

	const changes = parseChanges(row.changes);
	if (changes === null) {
		return { ok: false, reason: "invalid_changes" };
	}

	const oldValue = asRecordOrNull(row.oldValue);
	if (!oldValue.ok) {
		return { ok: false, reason: "invalid_snapshot" };
	}
	const newValue = asRecordOrNull(row.newValue);
	if (!newValue.ok) {
		return { ok: false, reason: "invalid_snapshot" };
	}
	const metadata = asRecordOrNull(row.metadata);
	if (!metadata.ok) {
		return { ok: false, reason: "invalid_snapshot" };
	}

	return {
		ok: true,
		data: {
			id: row.id,
			organizationId: row.organizationId,
			actorUserId: row.actorUserId,
			correlationId: row.correlationId,
			module: row.module,
			entity: row.entity,
			entityId: row.entityId,
			action: row.action,
			changes,
			oldValue: oldValue.data,
			newValue: newValue.data,
			metadata: metadata.data,
			ipAddress: row.ipAddress,
			userAgent: row.userAgent,
			createdAt: row.createdAt,
		},
	};
}
