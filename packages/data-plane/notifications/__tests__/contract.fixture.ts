import {
	type NotificationPriority,
	notifications,
} from "@afenda/notifications";

const priority: NotificationPriority = notifications.vocabulary.priority.medium;

export const recorded = notifications.record({
	organizationId: "org-1",
	userId: "user-1",
	type: notifications.vocabulary.type.info,
	priority,
	title: "Welcome",
	body: "Your inbox is ready.",
	module: "identity",
});
export const inbox = notifications.inbox.list({
	organizationId: "org-1",
	userId: "user-1",
});

// @ts-expect-error persistence stores are not public capabilities
notifications.createStore();

// @ts-expect-error consumers cannot construct unknown priority values
export const invalidPriority: NotificationPriority = "CRITICAL";

// @ts-expect-error read-state internals cannot be overridden per call
notifications.inbox.markRead({}, { read: false });
