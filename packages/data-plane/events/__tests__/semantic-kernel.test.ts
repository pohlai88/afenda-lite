import { describe, expect, it } from "vitest";

import { createEventPublisher } from "../src/publisher";
import {
	deserializeDomainEvent,
	serializeDomainEvent,
} from "../src/serialization";
import { assertOk, MemoryEventStore } from "./helpers/memory-event-store";

describe("@afenda/events semantic kernel", () => {
	it("round-trips a registry-validated envelope without lease state", async () => {
		const store = new MemoryEventStore();
		const event = assertOk(
			await createEventPublisher({ store }).publish({
				type: "platform.organization.deleted",
				sourceModule: "platform",
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "correlation-1",
				payload: { organizationId: "org-1", deletedByUserId: "user-1" },
			}),
		);

		const serialized = serializeDomainEvent(event);
		expect(serialized).not.toContain("claimToken");
		expect(serialized).not.toContain("claimedAt");
		expect(deserializeDomainEvent(serialized)).toEqual(event);
	});

	it("allows one active claim and requires its opaque token to complete", async () => {
		const store = new MemoryEventStore();
		const event = assertOk(
			await createEventPublisher({ store }).publish({
				type: "platform.organization.deleted",
				sourceModule: "platform",
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "correlation-1",
				payload: { organizationId: "org-1", deletedByUserId: "user-1" },
			}),
		);

		const [claim] = assertOk(
			await store.claimPending({ organizationId: "org-1", limit: 1 }),
		);
		expect(claim?.event.status).toBe("processing");
		expect(
			assertOk(await store.claimPending({ organizationId: "org-1", limit: 1 })),
		).toEqual([]);
		expect(
			assertOk(
				await store.markProcessed({
					claimToken: "wrong-token",
					id: event.id,
					organizationId: "org-1",
				}),
			),
		).toBeNull();
		expect(
			assertOk(
				await store.markProcessed({
					claimToken: claim?.claimToken ?? "missing-token",
					id: event.id,
					organizationId: "org-1",
				}),
			).status,
		).toBe("processed");
	});

	it("rejects source-module and payload interpretations outside the registry", async () => {
		const result = await createEventPublisher({
			store: new MemoryEventStore(),
		}).publish({
			type: "platform.organization.deleted",
			sourceModule: "identity",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "correlation-1",
			payload: { arbitrary: true },
		});
		expect(result.ok).toBe(false);
	});
});
