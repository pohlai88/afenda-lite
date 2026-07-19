import { fail, type Result } from "@afenda/errors/result";

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

export async function listNotifications(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<Notification[]>> {
	const parsed = notificationListOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid notification list input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveNotificationStore(store).listByUser(parsed.data);
}

export async function countUnreadNotifications(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<number>> {
	const parsed = notificationUnreadCountOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid notification unread-count input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveNotificationStore(store).countUnread(parsed.data);
}

export async function markNotificationRead(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<Notification | null>> {
	const parsed = notificationMarkReadOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid notification mark-read input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveNotificationStore(store).markRead(parsed.data);
}

export async function markAllNotificationsRead(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<number>> {
	const parsed = notificationMarkAllReadOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid notification mark-all-read input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveNotificationStore(store).markAllRead(parsed.data);
}

export async function deleteNotification(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<{ deleted: boolean }>> {
	const parsed = notificationDeleteOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid notification delete input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveNotificationStore(store).delete(parsed.data);
}

export async function purgeExpiredNotifications(
	input: unknown,
	store?: NotificationStore,
): Promise<Result<number>> {
	const parsed = notificationPurgeOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid notification purge input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveNotificationStore(store).purgeExpired(parsed.data);
}
