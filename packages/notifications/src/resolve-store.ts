import { createDrizzleNotificationStore } from "./drizzle-store";
import type { NotificationStore } from "./store";

export function resolveNotificationStore(
	store?: NotificationStore,
): NotificationStore {
	return store ?? createDrizzleNotificationStore();
}
