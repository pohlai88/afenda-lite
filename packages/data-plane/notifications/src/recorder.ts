import { errorResult, type Result } from "@afenda/errors";

import { resolveNotificationStore } from "./resolve-store";
import { recordNotificationCommandSchema } from "./schemas";
import type { NotificationStore } from "./store";
import type { Notification } from "./types";

export interface CreateNotificationRecorderOptions {
	store?: NotificationStore;
}

export interface NotificationRecorder {
	record: (input: unknown) => Promise<Result<Notification>>;
}

export function createNotificationRecorder(
	options: CreateNotificationRecorderOptions = {},
): NotificationRecorder {
	const store = resolveNotificationStore(options.store);

	return {
		record(input: unknown): Promise<Result<Notification>> {
			const parsed = recordNotificationCommandSchema.safeParse(input);
			if (!parsed.success) {
				return Promise.resolve(
					errorResult.fail("VALIDATION_ERROR", {
						publicMessage: "Invalid notification record input",
					}),
				);
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
