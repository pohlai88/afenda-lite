/**
 * Identity domain adapter — role assign → `@afenda/notifications`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationMocks = vi.hoisted(() => ({
	record: vi.fn(),
}));

vi.mock("@afenda/notifications", () => ({
	createNotificationRecorder: () => ({
		record: notificationMocks.record,
	}),
}));

import { recordOrgRoleAssignedNotification } from "../modules/identity/domain/record-org-role-assigned-notification";

describe("recordOrgRoleAssignedNotification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		notificationMocks.record.mockResolvedValue({
			ok: true,
			data: { id: "notif-1" },
		});
	});

	it("records SUCCESS IN_APP notification for the target member", async () => {
		const result = await recordOrgRoleAssignedNotification({
			organizationId: "org-1",
			userId: "user-target",
			roleId: "role-1",
			assignmentId: "assign-1",
			actorUserId: "user-actor",
			reactivated: false,
		});

		expect(result.ok).toBe(true);
		expect(notificationMocks.record).toHaveBeenCalledWith({
			organizationId: "org-1",
			userId: "user-target",
			type: "SUCCESS",
			priority: "MEDIUM",
			channel: "IN_APP",
			title: "Organization role assigned",
			body: "You were assigned an organization role.",
			module: "identity",
			actionUrl: "/admin",
			metadata: {
				roleId: "role-1",
				assignmentId: "assign-1",
				actorUserId: "user-actor",
				reactivated: false,
			},
		});
	});

	it("uses reactivated copy when assignment was reactivated", async () => {
		await recordOrgRoleAssignedNotification({
			organizationId: "org-1",
			userId: "user-target",
			roleId: "role-1",
			assignmentId: "assign-1",
			actorUserId: "user-actor",
			reactivated: true,
		});

		expect(notificationMocks.record).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Organization role reactivated",
				body: "An organization role assignment was reactivated for your account.",
				metadata: expect.objectContaining({ reactivated: true }),
			}),
		);
	});

	it("forwards recorder Result failures", async () => {
		notificationMocks.record.mockResolvedValue({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Failed to write notification",
		});

		const result = await recordOrgRoleAssignedNotification({
			organizationId: "org-1",
			userId: "user-target",
			roleId: "role-1",
			assignmentId: "assign-1",
			actorUserId: "user-actor",
			reactivated: false,
		});

		expect(result).toEqual({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Failed to write notification",
		});
	});
});
