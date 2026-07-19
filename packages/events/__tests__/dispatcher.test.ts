import { describe, expect, it, vi } from "vitest";

import { createEventDispatcher } from "../src/dispatcher";
import { createEventPublisher } from "../src/publisher";
import { assertOk, MemoryEventStore } from "./helpers/memory-event-store";

describe("@afenda/events dispatcher", () => {
	it("runs matching handlers and marks processed", async () => {
		const store = new MemoryEventStore();
		const publisher = createEventPublisher({ store });
		const handler = vi.fn(async () => undefined);

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

		const dispatcher = createEventDispatcher({
			store,
			handlers: {
				"identity.org_role.assigned": handler,
			},
		});

		const summary = assertOk(
			await dispatcher.dispatchPending({ organizationId: "org-1" }),
		);

		expect(summary.claimed).toBe(1);
		expect(summary.processed).toBe(1);
		expect(summary.failed).toBe(0);
		expect(handler).toHaveBeenCalledOnce();
		expect(store.all()[0]?.status).toBe("processed");
	});

	it("marks failed when handler throws", async () => {
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

		const dispatcher = createEventDispatcher({
			store,
			handlers: {
				"identity.org_role.assigned": async () => {
					throw new Error("handler boom");
				},
			},
		});

		const summary = assertOk(
			await dispatcher.dispatchPending({ organizationId: "org-1" }),
		);

		expect(summary.failed).toBe(1);
		expect(summary.processed).toBe(0);
		expect(store.all()[0]?.status).toBe("failed");
		expect(store.all()[0]?.lastError).toBe("handler boom");
		expect(store.all()[0]?.attempts).toBe(1);
	});

	it("skips events without a registered handler", async () => {
		const store = new MemoryEventStore();
		const publisher = createEventPublisher({ store });

		assertOk(
			await publisher.publish({
				type: "platform.organization.deleted",
				sourceModule: "platform",
				organizationId: "org-1",
				actorUserId: "user-actor",
				correlationId: "corr-1",
				payload: {
					organizationId: "org-1",
					deletedByUserId: "user-actor",
				},
			}),
		);

		const dispatcher = createEventDispatcher({
			store,
			handlers: {},
		});

		const summary = assertOk(
			await dispatcher.dispatchPending({ organizationId: "org-1" }),
		);

		expect(summary.skipped).toBe(1);
		expect(summary.processed).toBe(0);
		expect(store.all()[0]?.status).toBe("pending");
	});
});
