/**
 * Org-scoped in-app notification vocabulary (IN_APP channel only in slice-1).
 */

export const NOTIFICATION_TYPES = [
	"INFO",
	"WARNING",
	"ERROR",
	"SUCCESS",
	"ACTION_REQUIRED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_PRIORITIES = [
	"LOW",
	"MEDIUM",
	"HIGH",
	"URGENT",
] as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

/** Slice-1 ships IN_APP only — widen when a second real transport lands. */
export const NOTIFICATION_CHANNELS = ["IN_APP"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface Notification {
	actionUrl: string | null;
	body: string;
	channel: NotificationChannel;
	createdAt: Date;
	deduplicationKey: string | null;
	expiresAt: Date | null;
	id: string;
	metadata: Record<string, unknown> | null;
	module: string;
	organizationId: string;
	priority: NotificationPriority;
	read: boolean;
	title: string;
	type: NotificationType;
	userId: string;
}

export interface NotificationWriteInput {
	actionUrl?: string | null;
	body: string;
	channel: NotificationChannel;
	createdAt?: Date;
	deduplicationKey?: string | null;
	expiresAt?: Date | null;
	metadata?: Record<string, unknown> | null;
	module: string;
	organizationId: string;
	priority: NotificationPriority;
	title: string;
	type: NotificationType;
	userId: string;
}

export interface NotificationListOptions {
	organizationId: string;
	page: number;
	pageSize: number;
	unreadOnly?: boolean | undefined;
	userId: string;
}

export interface NotificationUnreadCountOptions {
	organizationId: string;
	userId: string;
}

export interface NotificationMarkReadOptions {
	id: string;
	organizationId: string;
	userId: string;
}

export interface NotificationMarkAllReadOptions {
	organizationId: string;
	userId: string;
}

export interface NotificationDeleteOptions {
	id: string;
	organizationId: string;
	userId: string;
}

export interface NotificationPurgeOptions {
	olderThan?: Date | undefined;
	organizationId: string;
}
