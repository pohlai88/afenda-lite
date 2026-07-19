import { describe, expect, it } from "vitest";

import { createEventPublisher } from "../src/publisher";
import { purgeProcessedDomainEvents, queryDomainEvents } from "../src/query";
import { assertOk, MemoryEventStore } from "./helpers/memory-event-store";

describe("@afenda/events query", () => {
	it("lists org-scoped events with total", async () => {
		const store = new MemoryEventStore();
		const publisher = createEventPublisher({ store });

		assertOk(
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

		const page = assertOk(
			await queryDomainEvents(
				{ organizationId: "org-1", type: "identity.org_role.assigned" },
				store,
			),
		);

		expect(page.total).toBe(1);
		expect(page.entries).toHaveLength(1);
		expect(page.entries[0]?.type).toBe("identity.org_role.assigned");
	});

	it("purges only processed rows older than cutoff", async () => {
		const store = new MemoryEventStore();
		const publisher = createEventPublisher({ store });

		const pending = assertOk(
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

		const oldProcessed = assertOk(
			await publisher.publish({
				type: "platform.organization.deleted",
				sourceModule: "platform",
				organizationId: "org-1",
				actorUserId: "user-actor",
				correlationId: "corr-2",
				payload: {
					organizationId: "org-1",
					deletedByUserId: "user-actor",
				},
			}),
		);

		await store.markProcessed({
			id: oldProcessed.id,
			organizationId: "org-1",
			processedAt: new Date("2020-01-02T00:00:00.000Z"),
		});
		const stored = store.all().find((row) => row.id === oldProcessed.id);
		if (stored) {
			stored.occurredAt = new Date("2020-01-01T00:00:00.000Z");
		}

		const purged = assertOk(
			await purgeProcessedDomainEvents(
				{
					organizationId: "org-1",
					olderThan: new Date("2021-01-01T00:00:00.000Z"),
				},
				store,
			),
		);

		expect(purged).toBe(1);
		expect(store.all().map((row) => row.id)).toEqual([pending.id]);
	});
});
