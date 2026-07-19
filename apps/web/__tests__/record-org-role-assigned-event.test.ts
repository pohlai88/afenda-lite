/**
 * Identity domain adapter — role assign → `@afenda/events` → notification handler.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const eventMocks = vi.hoisted(() => ({
	publish: vi.fn(),
	dispatchPending: vi.fn(),
	recordNotification: vi.fn(),
}));

vi.mock("@afenda/events", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/events")>();
	return {
		...actual,
		createEventPublisher: () => ({
			publish: eventMocks.publish,
		}),
		createEventDispatcher: (options: {
			handlers: Record<string, (event: unknown) => Promise<void>>;
		}) => ({
			dispatchPending: async (input: unknown) => {
				const result = await eventMocks.dispatchPending(input);
				if (
					result.ok &&
					typeof options.handlers["identity.org_role.assigned"] === "function"
				) {
					const event = {
						id: "evt-1",
						type: "identity.org_role.assigned",
						organizationId: "org-1",
						actorUserId: "user-actor",
						payload: {
							roleId: "role-1",
							assignmentId: "assign-1",
							recipientUserId: "user-target",
							reactivated: false,
						},
					};
					await options.handlers["identity.org_role.assigned"](event);
					return {
						ok: true,
						data: {
							claimed: 1,
							processed: 1,
							failed: 0,
							skipped: 0,
							events: [{ ...event, status: "processed", lastError: null }],
						},
					};
				}
				return result;
			},
		}),
	};
});

vi.mock(
	"../modules/identity/domain/record-org-role-assigned-notification",
	() => ({
		recordOrgRoleAssignedNotification: eventMocks.recordNotification,
	}),
);

import { recordOrgRoleAssignedEvent } from "../modules/identity/domain/record-org-role-assigned-event";

describe("recordOrgRoleAssignedEvent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		eventMocks.publish.mockResolvedValue({
			ok: true,
			data: {
				id: "evt-1",
				type: "identity.org_role.assigned",
				status: "pending",
			},
		});
		eventMocks.dispatchPending.mockResolvedValue({
			ok: true,
			data: {
				claimed: 1,
				processed: 1,
				failed: 0,
				skipped: 0,
				events: [],
			},
		});
		eventMocks.recordNotification.mockResolvedValue({
			ok: true,
			data: { id: "notif-1" },
		});
	});

	it("publishes identity.org_role.assigned and records inbox via handler", async () => {
		const result = await recordOrgRoleAssignedEvent({
			organizationId: "org-1",
			userId: "user-target",
			roleId: "role-1",
			assignmentId: "assign-1",
			actorUserId: "user-actor",
			correlationId: "corr-1",
			reactivated: false,
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.notificationId).toBe("notif-1");
		}
		expect(eventMocks.publish).toHaveBeenCalledWith({
			type: "identity.org_role.assigned",
			sourceModule: "identity",
			organizationId: "org-1",
			actorUserId: "user-actor",
			correlationId: "corr-1",
			payload: {
				roleId: "role-1",
				assignmentId: "assign-1",
				recipientUserId: "user-target",
				reactivated: false,
			},
		});
		expect(eventMocks.recordNotification).toHaveBeenCalledWith({
			organizationId: "org-1",
			userId: "user-target",
			roleId: "role-1",
			assignmentId: "assign-1",
			actorUserId: "user-actor",
			reactivated: false,
		});
	});

	it("forwards publish failures", async () => {
		eventMocks.publish.mockResolvedValue({
			ok: false,
			code: "BAD_REQUEST",
			message: "Invalid event publish input",
		});

		const result = await recordOrgRoleAssignedEvent({
			organizationId: "org-1",
			userId: "user-target",
			roleId: "role-1",
			assignmentId: "assign-1",
			actorUserId: "user-actor",
			correlationId: "corr-1",
			reactivated: false,
		});

		expect(result).toEqual({
			ok: false,
			code: "BAD_REQUEST",
			message: "Invalid event publish input",
		});
		expect(eventMocks.recordNotification).not.toHaveBeenCalled();
	});
});
