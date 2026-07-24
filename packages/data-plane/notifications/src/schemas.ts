import { z } from "zod";

import {
	NOTIFICATION_CHANNELS,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
} from "./types";

export const DEFAULT_NOTIFICATION_PAGE = 1 as const;
export const DEFAULT_NOTIFICATION_PAGE_SIZE = 50 as const;
export const MAX_NOTIFICATION_PAGE_SIZE = 100 as const;
export const MAX_NOTIFICATION_TITLE_LENGTH = 200 as const;
export const MAX_NOTIFICATION_BODY_LENGTH = 2_000 as const;
export const MAX_NOTIFICATION_MODULE_LENGTH = 64 as const;
export const MAX_NOTIFICATION_DEDUPLICATION_KEY_LENGTH = 200 as const;
export const MAX_NOTIFICATION_ACTION_URL_LENGTH = 2_048 as const;

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export const notificationPrioritySchema = z.enum(NOTIFICATION_PRIORITIES);
export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const notificationSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	userId: z.string().min(1),
	type: notificationTypeSchema,
	priority: notificationPrioritySchema,
	channel: notificationChannelSchema,
	title: z.string().min(1).max(MAX_NOTIFICATION_TITLE_LENGTH),
	body: z.string().min(1).max(MAX_NOTIFICATION_BODY_LENGTH),
	module: z.string().min(1).max(MAX_NOTIFICATION_MODULE_LENGTH),
	deduplicationKey: z
		.string()
		.min(1)
		.max(MAX_NOTIFICATION_DEDUPLICATION_KEY_LENGTH)
		.nullable(),
	actionUrl: z.string().max(MAX_NOTIFICATION_ACTION_URL_LENGTH).nullable(),
	metadata: jsonObjectSchema.nullable(),
	read: z.boolean(),
	expiresAt: z
		.union([z.string().datetime(), z.date()])
		.nullable()
		.transform((value) => {
			if (value === null) {
				return null;
			}
			return value instanceof Date ? value : new Date(value);
		}),
	createdAt: z
		.union([z.string().datetime(), z.date()])
		.transform((value) => (value instanceof Date ? value : new Date(value))),
});

export type ParsedNotification = z.infer<typeof notificationSchema>;

export const recordNotificationCommandSchema = z.object({
	organizationId: z.string().trim().min(1),
	userId: z.string().trim().min(1),
	type: notificationTypeSchema,
	priority: notificationPrioritySchema,
	channel: notificationChannelSchema.default("IN_APP"),
	title: z.string().trim().min(1).max(MAX_NOTIFICATION_TITLE_LENGTH),
	body: z.string().trim().min(1).max(MAX_NOTIFICATION_BODY_LENGTH),
	module: z.string().trim().min(1).max(MAX_NOTIFICATION_MODULE_LENGTH),
	deduplicationKey: z
		.string()
		.trim()
		.min(1)
		.max(MAX_NOTIFICATION_DEDUPLICATION_KEY_LENGTH)
		.optional(),
	actionUrl: z
		.string()
		.trim()
		.min(1)
		.max(MAX_NOTIFICATION_ACTION_URL_LENGTH)
		.optional(),
	metadata: jsonObjectSchema.optional(),
	expiresAt: z.coerce.date().optional(),
});

export type RecordNotificationCommand = z.infer<
	typeof recordNotificationCommandSchema
>;

export const notificationListOptionsSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		userId: z.string().trim().min(1),
		page: z.number().int().min(1).optional(),
		pageSize: z
			.number()
			.int()
			.min(1)
			.max(MAX_NOTIFICATION_PAGE_SIZE)
			.optional(),
		unreadOnly: z.boolean().optional(),
	})
	.transform((value) => ({
		organizationId: value.organizationId,
		userId: value.userId,
		page: value.page ?? DEFAULT_NOTIFICATION_PAGE,
		pageSize: value.pageSize ?? DEFAULT_NOTIFICATION_PAGE_SIZE,
		unreadOnly: value.unreadOnly,
	}));

export type ParsedNotificationListOptions = z.infer<
	typeof notificationListOptionsSchema
>;

export const notificationUnreadCountOptionsSchema = z.object({
	organizationId: z.string().trim().min(1),
	userId: z.string().trim().min(1),
});

export type ParsedNotificationUnreadCountOptions = z.infer<
	typeof notificationUnreadCountOptionsSchema
>;

export const notificationMarkReadOptionsSchema = z.object({
	organizationId: z.string().trim().min(1),
	userId: z.string().trim().min(1),
	id: z.string().trim().min(1),
});

export type ParsedNotificationMarkReadOptions = z.infer<
	typeof notificationMarkReadOptionsSchema
>;

export const notificationMarkAllReadOptionsSchema = z.object({
	organizationId: z.string().trim().min(1),
	userId: z.string().trim().min(1),
});

export type ParsedNotificationMarkAllReadOptions = z.infer<
	typeof notificationMarkAllReadOptionsSchema
>;

export const notificationDeleteOptionsSchema = z.object({
	organizationId: z.string().trim().min(1),
	userId: z.string().trim().min(1),
	id: z.string().trim().min(1),
});

export type ParsedNotificationDeleteOptions = z.infer<
	typeof notificationDeleteOptionsSchema
>;

export const notificationPurgeOptionsSchema = z.object({
	organizationId: z.string().trim().min(1),
	olderThan: z.coerce.date().optional(),
});

export type ParsedNotificationPurgeOptions = z.infer<
	typeof notificationPurgeOptionsSchema
>;
