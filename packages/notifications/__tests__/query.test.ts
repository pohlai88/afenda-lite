import { describe, expect, it } from "vitest";

import {
	countUnreadNotifications,
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	purgeExpiredNotifications,
} from "../src/query";
import { createNotificationRecorder } from "../src/recorder";
import {
	assertOk,
	MemoryNotificationStore,
} from "./helpers/memory-notification-store";

describe("@afenda/notifications query", () => {
	it("lists, counts, marks read with org+user ownership", async () => {
		const store = new MemoryNotificationStore();
		const recorder = createNotificationRecorder({ store });

		const a = assertOk(
			await recorder.record({
				organizationId: "org-1",
				userId: "user-1",
				type: "INFO",
				priority: "MEDIUM",
				title: "A",
				body: "Body A",
				module: "identity",
			}),
		);
		assertOk(
			await recorder.record({
				organizationId: "org-1",
				userId: "user-2",
				type: "INFO",
				priority: "MEDIUM",
				title: "B",
				body: "Body B",
				module: "identity",
			}),
		);

		const listed = assertOk(
			await listNotifications(
				{ organizationId: "org-1", userId: "user-1" },
				store,
			),
		);
		expect(listed).toHaveLength(1);
		expect(listed[0]?.id).toBe(a.id);

		expect(
			assertOk(
				await countUnreadNotifications(
					{ organizationId: "org-1", userId: "user-1" },
					store,
				),
			),
		).toBe(1);

		const marked = assertOk(
			await markNotificationRead(
				{ organizationId: "org-1", userId: "user-1", id: a.id },
				store,
			),
		);
		expect(marked?.read).toBe(true);

		// Wrong user cannot mark
		const crossUser = assertOk(
			await markNotificationRead(
				{ organizationId: "org-1", userId: "user-2", id: a.id },
				store,
			),
		);
		expect(crossUser).toBeNull();

		expect(
			assertOk(
				await countUnreadNotifications(
					{ organizationId: "org-1", userId: "user-1" },
					store,
				),
			),
		).toBe(0);
	});

	it("markAllRead only affects the owning user", async () => {
		const store = new MemoryNotificationStore();
		const recorder = createNotificationRecorder({ store });

		assertOk(
			await recorder.record({
				organizationId: "org-1",
				userId: "user-1",
				type: "INFO",
				priority: "LOW",
				title: "U1",
				body: "Body",
				module: "identity",
			}),
		);
		assertOk(
			await recorder.record({
				organizationId: "org-1",
				userId: "user-2",
				type: "INFO",
				priority: "LOW",
				title: "U2",
				body: "Body",
				module: "identity",
			}),
		);

		expect(
			assertOk(
				await markAllNotificationsRead(
					{ organizationId: "org-1", userId: "user-1" },
					store,
				),
			),
		).toBe(1);

		expect(
			assertOk(
				await countUnreadNotifications(
					{ organizationId: "org-1", userId: "user-2" },
					store,
				),
			),
		).toBe(1);
	});

	it("purges expired rows for the org", async () => {
		const store = new MemoryNotificationStore();
		const recorder = createNotificationRecorder({ store });

		assertOk(
			await recorder.record({
				organizationId: "org-1",
				userId: "user-1",
				type: "WARNING",
				priority: "HIGH",
				title: "Expired",
				body: "Gone",
				module: "identity",
				expiresAt: new Date(Date.now() - 1_000),
			}),
		);
		assertOk(
			await recorder.record({
				organizationId: "org-1",
				userId: "user-1",
				type: "INFO",
				priority: "LOW",
				title: "Keep",
				body: "Stay",
				module: "identity",
			}),
		);

		expect(
			assertOk(
				await purgeExpiredNotifications({ organizationId: "org-1" }, store),
			),
		).toBe(1);
		expect(store.all()).toHaveLength(1);
		expect(store.all()[0]?.title).toBe("Keep");
	});
});
