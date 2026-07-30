import { notificationSchema } from "./schemas";
import type { Notification } from "./types";

export interface NotificationRow {
	actionUrl: string | null;
	body: string;
	channel: string;
	createdAt: Date;
	deduplicationKey: string | null;
	expiresAt: Date | null;
	id: string;
	metadata: unknown;
	module: string;
	organizationId: string;
	priority: string;
	read: boolean;
	title: string;
	type: string;
	userId: string;
}

export interface MapNotificationRowFailure {
	ok: false;
	reason: "invalid_metadata" | "invalid_notification";
}

export type MapNotificationRowResult =
	| { ok: true; data: Notification }
	| MapNotificationRowFailure;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
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

export function mapNotificationRow(
	row: NotificationRow,
): MapNotificationRowResult {
	const metadata = asRecordOrNull(row.metadata);
	if (!metadata.ok) {
		return { ok: false, reason: "invalid_metadata" };
	}

	const parsed = notificationSchema.safeParse({
		id: row.id,
		organizationId: row.organizationId,
		userId: row.userId,
		type: row.type,
		priority: row.priority,
		channel: row.channel,
		title: row.title,
		body: row.body,
		module: row.module,
		deduplicationKey: row.deduplicationKey,
		actionUrl: row.actionUrl,
		metadata: metadata.data,
		read: row.read,
		expiresAt: row.expiresAt,
		createdAt: row.createdAt,
	});

	if (!parsed.success) {
		return { ok: false, reason: "invalid_notification" };
	}

	return { ok: true, data: parsed.data };
}
