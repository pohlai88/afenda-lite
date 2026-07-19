/**
 * Member inbox Actions — session stamps org/user; never trusts client ids.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
	getSession: vi.fn(),
}));

const notificationMocks = vi.hoisted(() => ({
	listNotifications: vi.fn(),
	countUnreadNotifications: vi.fn(),
	markNotificationRead: vi.fn(),
	markAllNotificationsRead: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	getSession: authMocks.getSession,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-test-1",
}));

vi.mock("@afenda/notifications", () => ({
	MAX_NOTIFICATION_PAGE_SIZE: 100,
	listNotifications: notificationMocks.listNotifications,
	countUnreadNotifications: notificationMocks.countUnreadNotifications,
	markNotificationRead: notificationMocks.markNotificationRead,
	markAllNotificationsRead: notificationMocks.markAllNotificationsRead,
}));

vi.mock("@/modules/platform/observability/product-log", () => ({
	logProductEvent: vi.fn(),
}));

import { getUnreadNotificationCountAction } from "../app/actions/get-unread-notification-count";
import { listMyNotificationsAction } from "../app/actions/list-my-notifications";
import { markAllNotificationsReadAction } from "../app/actions/mark-all-notifications-read";
import { markNotificationReadAction } from "../app/actions/mark-notification-read";

describe("member notification Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue({
			userId: "user-session",
			orgId: "org-session",
			role: "client",
		});
		notificationMocks.listNotifications.mockResolvedValue({
			ok: true,
			data: [],
		});
		notificationMocks.countUnreadNotifications.mockResolvedValue({
			ok: true,
			data: 2,
		});
		notificationMocks.markNotificationRead.mockResolvedValue({
			ok: true,
			data: {
				id: "n1",
				organizationId: "org-session",
				userId: "user-session",
				read: true,
			},
		});
		notificationMocks.markAllNotificationsRead.mockResolvedValue({
			ok: true,
			data: 3,
		});
	});

	it("list stamps session org + user (ignores client org/user fields)", async () => {
		const formData = new FormData();
		formData.set("page", "1");
		formData.set("organizationId", "org-attacker");
		formData.set("userId", "user-attacker");

		const state = await listMyNotificationsAction(null, formData);
		expect(state?.ok).toBe(true);
		expect(notificationMocks.listNotifications).toHaveBeenCalledWith({
			organizationId: "org-session",
			userId: "user-session",
			page: 1,
			pageSize: undefined,
			unreadOnly: undefined,
		});
	});

	it("mark-read returns NOT_FOUND when ownership miss", async () => {
		notificationMocks.markNotificationRead.mockResolvedValue({
			ok: true,
			data: null,
		});
		const formData = new FormData();
		formData.set("id", "missing-id");

		const state = await markNotificationReadAction(null, formData);
		expect(state).toEqual({
			ok: false,
			code: "NOT_FOUND",
			message: "That notification was not found for your account.",
		});
		expect(notificationMocks.markNotificationRead).toHaveBeenCalledWith({
			organizationId: "org-session",
			userId: "user-session",
			id: "missing-id",
		});
	});

	it("unread count and mark-all use session scope only", async () => {
		const empty = new FormData();
		const unread = await getUnreadNotificationCountAction(null, empty);
		const marked = await markAllNotificationsReadAction(null, empty);

		expect(unread).toEqual({
			ok: true,
			data: { unreadCount: 2 },
		});
		expect(marked).toEqual({
			ok: true,
			data: { marked: 3 },
		});
		expect(notificationMocks.countUnreadNotifications).toHaveBeenCalledWith({
			organizationId: "org-session",
			userId: "user-session",
		});
		expect(notificationMocks.markAllNotificationsRead).toHaveBeenCalledWith({
			organizationId: "org-session",
			userId: "user-session",
		});
	});
});
