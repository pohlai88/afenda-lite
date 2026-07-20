import "server-only";

export {
	createDrizzleNotificationStore,
	DrizzleNotificationStore,
} from "./drizzle-store";
export {
	countUnreadNotifications,
	deleteNotification,
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	purgeExpiredNotifications,
} from "./query";
export {
	type CreateNotificationRecorderOptions,
	createNotificationRecorder,
	type NotificationRecorder,
} from "./recorder";
export {
	DEFAULT_NOTIFICATION_PAGE,
	DEFAULT_NOTIFICATION_PAGE_SIZE,
	MAX_NOTIFICATION_ACTION_URL_LENGTH,
	MAX_NOTIFICATION_BODY_LENGTH,
	MAX_NOTIFICATION_MODULE_LENGTH,
	MAX_NOTIFICATION_PAGE_SIZE,
	MAX_NOTIFICATION_TITLE_LENGTH,
	notificationChannelSchema,
	notificationDeleteOptionsSchema,
	notificationListOptionsSchema,
	notificationMarkAllReadOptionsSchema,
	notificationMarkReadOptionsSchema,
	notificationPrioritySchema,
	notificationPurgeOptionsSchema,
	notificationSchema,
	notificationTypeSchema,
	notificationUnreadCountOptionsSchema,
	type ParsedNotification,
	type ParsedNotificationDeleteOptions,
	type ParsedNotificationListOptions,
	type ParsedNotificationMarkAllReadOptions,
	type ParsedNotificationMarkReadOptions,
	type ParsedNotificationPurgeOptions,
	type ParsedNotificationUnreadCountOptions,
	type RecordNotificationCommand,
	recordNotificationCommandSchema,
} from "./schemas";
export type { NotificationStore } from "./store";
export {
	NOTIFICATION_CHANNELS,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
	type Notification,
	type NotificationChannel,
	type NotificationDeleteOptions,
	type NotificationListOptions,
	type NotificationMarkAllReadOptions,
	type NotificationMarkReadOptions,
	type NotificationPriority,
	type NotificationPurgeOptions,
	type NotificationType,
	type NotificationUnreadCountOptions,
	type NotificationWriteInput,
} from "./types";
