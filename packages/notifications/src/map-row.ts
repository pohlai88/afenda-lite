import { notificationSchema } from "./schemas";
import type { Notification } from "./types";

export type NotificationRow = {
	id: string;
	organizationId: string;
	userId: string;
	type: string;
	priority: string;
	channel: string;
	title: string;
	body: string;
	module: string;
	actionUrl: string | null;
	metadata: unknown;
	read: boolean;
	expiresAt: Date | null;
	createdAt: Date;
};

export type MapNotificationRowFailure = {
	ok: false;
	reason: "invalid_metadata" | "invalid_notification";
};

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
