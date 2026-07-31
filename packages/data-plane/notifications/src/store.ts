import type { Result } from "@afenda/errors";

import type {
	Notification,
	NotificationDeleteOptions,
	NotificationListOptions,
	NotificationMarkAllReadOptions,
	NotificationMarkReadOptions,
	NotificationPurgeOptions,
	NotificationUnreadCountOptions,
	NotificationWriteInput,
} from "./types";

/**
 * Persistence port for in-app notifications. Production adapter: DrizzleNotificationStore.
 */
export interface NotificationStore {
	countUnread: (
		options: NotificationUnreadCountOptions,
	) => Promise<Result<number>>;
	delete: (
		options: NotificationDeleteOptions,
	) => Promise<Result<{ deleted: boolean }>>;
	listByUser: (
		options: NotificationListOptions,
	) => Promise<Result<Notification[]>>;
	markAllRead: (
		options: NotificationMarkAllReadOptions,
	) => Promise<Result<number>>;
	markRead: (
		options: NotificationMarkReadOptions,
	) => Promise<Result<Notification | null>>;
	purgeExpired: (options: NotificationPurgeOptions) => Promise<Result<number>>;
	write: (entry: NotificationWriteInput) => Promise<Result<Notification>>;
}
