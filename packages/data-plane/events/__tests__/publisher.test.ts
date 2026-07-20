import { describe, expect, it } from "vitest";

import { createEventPublisher } from "../src/publisher";
import { assertOk, MemoryEventStore } from "./helpers/memory-event-store";

describe("@afenda/events publisher", () => {
	it("rejects unknown event types", async () => {
		const store = new MemoryEventStore();
		const publisher = createEventPublisher({ store });

		const result = await publisher.publish({
			type: "crm.deal.won",
			sourceModule: "identity",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(store.all()).toHaveLength(0);
	});

	it("rejects invalid payload for known type", async () => {
		const store = new MemoryEventStore();
		const publisher = createEventPublisher({ store });

		const result = await publisher.publish({
			type: "identity.org_role.assigned",
			sourceModule: "identity",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: { roleId: "role-1" },
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(store.all()).toHaveLength(0);
	});

	it("appends a pending identity.org_role.assigned event", async () => {
		const store = new MemoryEventStore();
		const publisher = createEventPublisher({ store });

		const entry = assertOk(
			await publisher.publish({
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
			}),
		);

		expect(entry.status).toBe("pending");
		expect(entry.type).toBe("identity.org_role.assigned");
		expect(entry.organizationId).toBe("org-1");
		expect(entry.payload).toEqual({
			roleId: "role-1",
			assignmentId: "assign-1",
			recipientUserId: "user-target",
			reactivated: false,
		});
		expect(store.all()).toHaveLength(1);
	});
});
