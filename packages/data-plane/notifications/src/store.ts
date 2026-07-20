import type { Result } from "@afenda/errors/result";

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
export type NotificationStore = {
	write(entry: NotificationWriteInput): Promise<Result<Notification>>;
	listByUser(options: NotificationListOptions): Promise<Result<Notification[]>>;
	countUnread(options: NotificationUnreadCountOptions): Promise<Result<number>>;
	markRead(
		options: NotificationMarkReadOptions,
	): Promise<Result<Notification | null>>;
	markAllRead(options: NotificationMarkAllReadOptions): Promise<Result<number>>;
	delete(
		options: NotificationDeleteOptions,
	): Promise<Result<{ deleted: boolean }>>;
	purgeExpired(options: NotificationPurgeOptions): Promise<Result<number>>;
};
