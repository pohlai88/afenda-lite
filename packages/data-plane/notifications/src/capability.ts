import type { Result } from "@afenda/errors";

import {
	countUnreadNotifications,
	deleteNotification,
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	purgeExpiredNotifications,
} from "./query";
import { createNotificationRecorder } from "./recorder";
import {
	NOTIFICATION_CHANNEL_VALUES,
	NOTIFICATION_POLICY,
	NOTIFICATION_PRIORITY_VALUES,
	NOTIFICATION_TYPE_VALUES,
	NOTIFICATION_VOCABULARY,
} from "./semantic-registry";
import type { NotificationStore } from "./store";
import type { Notification } from "./types";

export interface NotificationsCapability {
	inbox: Readonly<{
		countUnread: (input: unknown) => Promise<Result<number>>;
		delete: (input: unknown) => Promise<Result<{ deleted: boolean }>>;
		list: (input: unknown) => Promise<Result<Notification[]>>;
		markAllRead: (input: unknown) => Promise<Result<number>>;
		markRead: (input: unknown) => Promise<Result<Notification | null>>;
	}>;
	lifecycle: Readonly<{
		purgeExpired: (input: unknown) => Promise<Result<number>>;
	}>;
	policy: typeof NOTIFICATION_POLICY;
	record: (input: unknown) => Promise<Result<Notification>>;
	values: Readonly<{
		channels: typeof NOTIFICATION_CHANNEL_VALUES;
		priorities: typeof NOTIFICATION_PRIORITY_VALUES;
		types: typeof NOTIFICATION_TYPE_VALUES;
	}>;
	vocabulary: typeof NOTIFICATION_VOCABULARY;
}

export function createNotificationsCapability(
	store?: NotificationStore,
): NotificationsCapability {
	const recorder =
		store === undefined
			? createNotificationRecorder()
			: createNotificationRecorder({ store });
	return Object.freeze({
		inbox: Object.freeze({
			countUnread: (input: unknown) => countUnreadNotifications(input, store),
			delete: (input: unknown) => deleteNotification(input, store),
			list: (input: unknown) => listNotifications(input, store),
			markAllRead: (input: unknown) => markAllNotificationsRead(input, store),
			markRead: (input: unknown) => markNotificationRead(input, store),
		}),
		lifecycle: Object.freeze({
			purgeExpired: (input: unknown) => purgeExpiredNotifications(input, store),
		}),
		policy: NOTIFICATION_POLICY,
		record: (input: unknown) => recorder.record(input),
		values: Object.freeze({
			channels: NOTIFICATION_CHANNEL_VALUES,
			priorities: NOTIFICATION_PRIORITY_VALUES,
			types: NOTIFICATION_TYPE_VALUES,
		}),
		vocabulary: NOTIFICATION_VOCABULARY,
	});
}

export const notifications = createNotificationsCapability();
