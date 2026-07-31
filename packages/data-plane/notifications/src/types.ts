import type {
	NotificationChannel as NotificationChannelValue,
	NotificationPriority as NotificationPriorityValue,
	NotificationType as NotificationTypeValue,
} from "./semantic-registry";

export type {
	NotificationChannel,
	NotificationPriority,
	NotificationType,
} from "./semantic-registry";

export interface Notification {
	actionUrl: string | null;
	body: string;
	channel: NotificationChannelValue;
	createdAt: Date;
	deduplicationKey: string | null;
	expiresAt: Date | null;
	id: string;
	metadata: Record<string, unknown> | null;
	module: string;
	organizationId: string;
	priority: NotificationPriorityValue;
	read: boolean;
	title: string;
	type: NotificationTypeValue;
	userId: string;
}

export interface NotificationWriteInput {
	actionUrl?: string | null;
	body: string;
	channel: NotificationChannelValue;
	createdAt?: Date;
	deduplicationKey?: string | null;
	expiresAt?: Date | null;
	metadata?: Record<string, unknown> | null;
	module: string;
	organizationId: string;
	priority: NotificationPriorityValue;
	title: string;
	type: NotificationTypeValue;
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
