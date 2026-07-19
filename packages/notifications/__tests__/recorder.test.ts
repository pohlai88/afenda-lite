import { describe, expect, it } from "vitest";

import { createNotificationRecorder } from "../src/recorder";
import {
	assertOk,
	MemoryNotificationStore,
} from "./helpers/memory-notification-store";

describe("@afenda/notifications recorder", () => {
	it("rejects missing organizationId and userId", async () => {
		const store = new MemoryNotificationStore();
		const recorder = createNotificationRecorder({ store });

		const missingOrg = await recorder.record({
			userId: "user-1",
			type: "INFO",
			priority: "MEDIUM",
			title: "Hello",
			body: "World",
			module: "identity",
		});
		expect(missingOrg.ok).toBe(false);
		if (!missingOrg.ok) {
			expect(missingOrg.code).toBe("BAD_REQUEST");
		}

		const missingUser = await recorder.record({
			organizationId: "org-1",
			type: "INFO",
			priority: "MEDIUM",
			title: "Hello",
			body: "World",
			module: "identity",
		});
		expect(missingUser.ok).toBe(false);
		if (!missingUser.ok) {
			expect(missingUser.code).toBe("BAD_REQUEST");
		}
		expect(store.all()).toHaveLength(0);
	});

	it("rejects non-IN_APP channels", async () => {
		const store = new MemoryNotificationStore();
		const recorder = createNotificationRecorder({ store });

		const result = await recorder.record({
			organizationId: "org-1",
			userId: "user-1",
			type: "INFO",
			priority: "MEDIUM",
			channel: "EMAIL",
			title: "Hello",
			body: "World",
			module: "identity",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(store.all()).toHaveLength(0);
	});

	it("defaults channel to IN_APP and persists", async () => {
		const store = new MemoryNotificationStore();
		const recorder = createNotificationRecorder({ store });

		const entry = assertOk(
			await recorder.record({
				organizationId: "org-1",
				userId: "user-1",
				type: "SUCCESS",
				priority: "HIGH",
				title: "Role assigned",
				body: "You were assigned Org Admin.",
				module: "identity",
				actionUrl: "/admin",
				metadata: { roleId: "role-1" },
			}),
		);

		expect(entry.channel).toBe("IN_APP");
		expect(entry.read).toBe(false);
		expect(entry.organizationId).toBe("org-1");
		expect(entry.userId).toBe("user-1");
		expect(entry.actionUrl).toBe("/admin");
		expect(store.all()).toHaveLength(1);
	});
});
