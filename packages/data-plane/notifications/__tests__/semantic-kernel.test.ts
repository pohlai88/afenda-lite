import { describe, expect, it } from "vitest";

import { createNotificationsCapability } from "../src/capability";
import {
	assertOk,
	MemoryNotificationStore,
} from "./helpers/memory-notification-store";

describe("@afenda/notifications semantic kernel", () => {
	it("derives vocabulary and policy from one capability", () => {
		const capability = createNotificationsCapability(
			new MemoryNotificationStore(),
		);
		expect(capability.values.channels).toEqual(["IN_APP"]);
		expect(capability.values.types).toContain(
			capability.vocabulary.type.actionRequired,
		);
		expect(capability.policy.readState.initial).toBe("unread");
	});

	it("normalizes persisted copy before enforcing limits", async () => {
		const store = new MemoryNotificationStore();
		const capability = createNotificationsCapability(store);
		const recorded = assertOk(
			await capability.record({
				organizationId: "org-1",
				userId: "user-1",
				type: capability.vocabulary.type.info,
				priority: capability.vocabulary.priority.medium,
				title: "  Account\u3000updated  ",
				body: "Your   account changed.",
				module: " identity ",
			}),
		);
		expect(recorded).toMatchObject({
			title: "Account updated",
			body: "Your account changed.",
			module: "identity",
			read: false,
		});
	});

	it("hides expired rows from inbox and unread count before purge", async () => {
		const store = new MemoryNotificationStore();
		const capability = createNotificationsCapability(store);
		assertOk(
			await capability.record({
				organizationId: "org-1",
				userId: "user-1",
				type: capability.vocabulary.type.warning,
				priority: capability.vocabulary.priority.high,
				title: "Expired",
				body: "No longer actionable.",
				module: "identity",
				expiresAt: new Date(Date.now() - 1000),
			}),
		);
		expect(
			assertOk(
				await capability.inbox.list({
					organizationId: "org-1",
					userId: "user-1",
				}),
			),
		).toEqual([]);
		expect(
			assertOk(
				await capability.inbox.countUnread({
					organizationId: "org-1",
					userId: "user-1",
				}),
			),
		).toBe(0);
	});

	it("keeps recipient read transitions idempotent", async () => {
		const store = new MemoryNotificationStore();
		const capability = createNotificationsCapability(store);
		const recorded = assertOk(
			await capability.record({
				organizationId: "org-1",
				userId: "user-1",
				type: capability.vocabulary.type.info,
				priority: capability.vocabulary.priority.low,
				title: "Notice",
				body: "Read once.",
				module: "identity",
			}),
		);
		const input = {
			organizationId: "org-1",
			userId: "user-1",
			id: recorded.id,
		};
		expect(assertOk(await capability.inbox.markRead(input))?.read).toBe(true);
		expect(assertOk(await capability.inbox.markRead(input))?.read).toBe(true);
		expect(
			assertOk(
				await capability.inbox.markAllRead({
					organizationId: "org-1",
					userId: "user-1",
				}),
			),
		).toBe(0);
	});
});
