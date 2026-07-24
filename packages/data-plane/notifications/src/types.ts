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

export type Notification = {
	id: string;
	organizationId: string;
	userId: string;
	type: NotificationType;
	priority: NotificationPriority;
	channel: NotificationChannel;
	title: string;
	body: string;
	module: string;
	deduplicationKey: string | null;
	actionUrl: string | null;
	metadata: Record<string, unknown> | null;
	read: boolean;
	expiresAt: Date | null;
	createdAt: Date;
};

export type NotificationWriteInput = {
	organizationId: string;
	userId: string;
	type: NotificationType;
	priority: NotificationPriority;
	channel: NotificationChannel;
	title: string;
	body: string;
	module: string;
	deduplicationKey?: string | null;
	actionUrl?: string | null;
	metadata?: Record<string, unknown> | null;
	expiresAt?: Date | null;
	createdAt?: Date;
};

export type NotificationListOptions = {
	organizationId: string;
	userId: string;
	page: number;
	pageSize: number;
	unreadOnly?: boolean;
};

export type NotificationUnreadCountOptions = {
	organizationId: string;
	userId: string;
};

export type NotificationMarkReadOptions = {
	organizationId: string;
	userId: string;
	id: string;
};

export type NotificationMarkAllReadOptions = {
	organizationId: string;
	userId: string;
};

export type NotificationDeleteOptions = {
	organizationId: string;
	userId: string;
	id: string;
};

export type NotificationPurgeOptions = {
	organizationId: string;
	olderThan?: Date;
};
