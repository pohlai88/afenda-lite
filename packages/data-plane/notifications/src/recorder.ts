import { fail, type Result } from "@afenda/errors/result";

import { resolveNotificationStore } from "./resolve-store";
import { recordNotificationCommandSchema } from "./schemas";
import type { NotificationStore } from "./store";
import type { Notification } from "./types";

export type CreateNotificationRecorderOptions = {
	store?: NotificationStore;
};

export type NotificationRecorder = {
	record(input: unknown): Promise<Result<Notification>>;
};

export function createNotificationRecorder(
	options: CreateNotificationRecorderOptions = {},
): NotificationRecorder {
	const store = resolveNotificationStore(options.store);

	return {
		async record(input: unknown): Promise<Result<Notification>> {
			const parsed = recordNotificationCommandSchema.safeParse(input);
			if (!parsed.success) {
				return fail("BAD_REQUEST", "Invalid notification record input", {
					fieldErrors: parsed.error.flatten().fieldErrors,
				});
			}

			const command = parsed.data;
			return store.write({
				organizationId: command.organizationId,
				userId: command.userId,
				type: command.type,
				priority: command.priority,
				channel: command.channel,
				title: command.title,
				body: command.body,
				module: command.module,
				deduplicationKey: command.deduplicationKey ?? null,
				actionUrl: command.actionUrl ?? null,
				metadata: command.metadata ?? null,
				expiresAt: command.expiresAt ?? null,
			});
		},
	};
}
