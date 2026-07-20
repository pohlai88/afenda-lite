import { describe, expect, it } from "vitest";

import { mapNotificationRow } from "../src/map-row";

describe("@afenda/notifications map-row", () => {
	it("maps a valid row", () => {
		const mapped = mapNotificationRow({
			id: "n1",
			organizationId: "org-1",
			userId: "user-1",
			type: "INFO",
			priority: "MEDIUM",
			channel: "IN_APP",
			title: "Hello",
			body: "World",
			module: "identity",
			actionUrl: "/admin",
			metadata: { roleId: "r1" },
			read: false,
			expiresAt: null,
			createdAt: new Date("2026-07-20T00:00:00.000Z"),
		});
		expect(mapped.ok).toBe(true);
		if (mapped.ok) {
			expect(mapped.data.title).toBe("Hello");
			expect(mapped.data.metadata).toEqual({ roleId: "r1" });
		}
	});

	it("rejects invalid channel", () => {
		const mapped = mapNotificationRow({
			id: "n1",
			organizationId: "org-1",
			userId: "user-1",
			type: "INFO",
			priority: "MEDIUM",
			channel: "EMAIL",
			title: "Hello",
			body: "World",
			module: "identity",
			actionUrl: null,
			metadata: null,
			read: false,
			expiresAt: null,
			createdAt: new Date(),
		});
		expect(mapped.ok).toBe(false);
		if (!mapped.ok) {
			expect(mapped.reason).toBe("invalid_notification");
		}
	});

	it("rejects non-object metadata", () => {
		const mapped = mapNotificationRow({
			id: "n1",
			organizationId: "org-1",
			userId: "user-1",
			type: "INFO",
			priority: "MEDIUM",
			channel: "IN_APP",
			title: "Hello",
			body: "World",
			module: "identity",
			actionUrl: null,
			metadata: ["not", "object"],
			read: false,
			expiresAt: null,
			createdAt: new Date(),
		});
		expect(mapped.ok).toBe(false);
		if (!mapped.ok) {
			expect(mapped.reason).toBe("invalid_metadata");
		}
	});
});
