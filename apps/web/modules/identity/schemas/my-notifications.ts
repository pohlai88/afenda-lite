import { MAX_NOTIFICATION_PAGE_SIZE } from "@afenda/notifications";
import { z } from "zod";

export const listMyNotificationsCommandSchema = z.object({
	page: z.coerce.number().int().min(1).optional(),
	pageSize: z.coerce
		.number()
		.int()
		.min(1)
		.max(MAX_NOTIFICATION_PAGE_SIZE)
		.optional(),
	unreadOnly: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => {
			if (value === undefined) {
				return undefined;
			}
			return value === "true";
		}),
});

export type ListMyNotificationsCommand = z.infer<
	typeof listMyNotificationsCommandSchema
>;

export const markMyNotificationReadCommandSchema = z.object({
	id: z.string().trim().min(1),
});

export type MarkMyNotificationReadCommand = z.infer<
	typeof markMyNotificationReadCommandSchema
>;
