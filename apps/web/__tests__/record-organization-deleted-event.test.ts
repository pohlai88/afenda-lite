/**
 * Platform domain adapter — org delete → `@afenda/events` outbox.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const eventMocks = vi.hoisted(() => ({
	publish: vi.fn(),
}));

vi.mock("@afenda/events", () => ({
	createEventPublisher: () => ({
		publish: eventMocks.publish,
	}),
}));

import { recordOrganizationDeletedEvent } from "../modules/platform/domain/record-organization-deleted-event";

describe("recordOrganizationDeletedEvent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		eventMocks.publish.mockResolvedValue({
			ok: true,
			data: {
				id: "evt-1",
				type: "platform.organization.deleted",
				status: "pending",
			},
		});
	});

	it("publishes platform.organization.deleted with org + actor", async () => {
		const result = await recordOrganizationDeletedEvent({
			organizationId: "org-1",
			deletedByUserId: "user-actor",
			correlationId: "corr-1",
		});

		expect(result.ok).toBe(true);
		expect(eventMocks.publish).toHaveBeenCalledWith({
			type: "platform.organization.deleted",
			sourceModule: "platform",
			organizationId: "org-1",
			actorUserId: "user-actor",
			correlationId: "corr-1",
			payload: {
				organizationId: "org-1",
				deletedByUserId: "user-actor",
			},
		});
	});

	it("forwards publish failures", async () => {
		eventMocks.publish.mockResolvedValue({
			ok: false,
			code: "BAD_REQUEST",
			message: "Invalid event publish input",
		});

		const result = await recordOrganizationDeletedEvent({
			organizationId: "org-1",
			deletedByUserId: "user-actor",
			correlationId: "corr-1",
		});

		expect(result).toEqual({
			ok: false,
			code: "BAD_REQUEST",
			message: "Invalid event publish input",
		});
	});
});
