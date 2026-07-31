import { errorResult, type Result } from "@afenda/errors";

import { resolveNotificationStore } from "./resolve-store";
import {
	notificationDeleteOptionsSchema,
	notificationListOptionsSchema,
	notificationMarkAllReadOptionsSchema,
	notificationMarkReadOptionsSchema,
	notificationPurgeOptionsSchema,
	notificationUnreadCountOptionsSchema,
} from "./schemas";
import type { NotificationStore } from "./store";
import type { Notification } from "./types";

export function listNotifications(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<Notification[]>> {
	const parsed = notificationListOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid notification list input",
			}),
		);
	}
	return resolveNotificationStore(store).listByUser(parsed.data);
}

export function countUnreadNotifications(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<number>> {
	const parsed = notificationUnreadCountOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid notification unread-count input",
			}),
		);
	}
	return resolveNotificationStore(store).countUnread(parsed.data);
}

export function markNotificationRead(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<Notification | null>> {
	const parsed = notificationMarkReadOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid notification mark-read input",
			}),
		);
	}
	return resolveNotificationStore(store).markRead(parsed.data);
}

export function markAllNotificationsRead(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<number>> {
	const parsed = notificationMarkAllReadOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid notification mark-all-read input",
			}),
		);
	}
	return resolveNotificationStore(store).markAllRead(parsed.data);
}

export function deleteNotification(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<{ deleted: boolean }>> {
	const parsed = notificationDeleteOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid notification delete input",
			}),
		);
	}
	return resolveNotificationStore(store).delete(parsed.data);
}

export function purgeExpiredNotifications(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<number>> {
	const parsed = notificationPurgeOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid notification purge input",
			}),
		);
	}
	return resolveNotificationStore(store).purgeExpired(parsed.data);
}
