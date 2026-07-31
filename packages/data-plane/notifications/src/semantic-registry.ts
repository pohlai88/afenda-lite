export const NOTIFICATION_VOCABULARY = Object.freeze({
	channel: Object.freeze({ inApp: "IN_APP" }),
	priority: Object.freeze({
		high: "HIGH",
		low: "LOW",
		medium: "MEDIUM",
		urgent: "URGENT",
	}),
	type: Object.freeze({
		actionRequired: "ACTION_REQUIRED",
		error: "ERROR",
		info: "INFO",
		success: "SUCCESS",
		warning: "WARNING",
	}),
});

export const NOTIFICATION_CHANNEL_VALUES = [
	NOTIFICATION_VOCABULARY.channel.inApp,
] as const;
export const NOTIFICATION_PRIORITY_VALUES = [
	NOTIFICATION_VOCABULARY.priority.low,
	NOTIFICATION_VOCABULARY.priority.medium,
	NOTIFICATION_VOCABULARY.priority.high,
	NOTIFICATION_VOCABULARY.priority.urgent,
] as const;
export const NOTIFICATION_TYPE_VALUES = [
	NOTIFICATION_VOCABULARY.type.info,
	NOTIFICATION_VOCABULARY.type.warning,
	NOTIFICATION_VOCABULARY.type.error,
	NOTIFICATION_VOCABULARY.type.success,
	NOTIFICATION_VOCABULARY.type.actionRequired,
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNEL_VALUES)[number];
export type NotificationPriority =
	(typeof NOTIFICATION_PRIORITY_VALUES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPE_VALUES)[number];

export const NOTIFICATION_POLICY = Object.freeze({
	deduplication: Object.freeze({
		scope: Object.freeze([
			"organizationId",
			"userId",
			"module",
			"deduplicationKey",
		] as const),
	}),
	limits: Object.freeze({
		actionUrl: 2048,
		body: 2000,
		deduplicationKey: 200,
		module: 64,
		title: 200,
	}),
	pagination: Object.freeze({
		defaultPage: 1,
		defaultPageSize: 50,
		maxPageSize: 100,
	}),
	readState: Object.freeze({
		initial: "unread",
		markAllScope: "organization-and-recipient",
		markOne: "idempotent",
	}),
	retention: Object.freeze({ expiredItemsAreVisible: false }),
});
