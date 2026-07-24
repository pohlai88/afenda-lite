import { describe, expect, it } from "vitest";

import { createEventPublisher } from "../src/publisher";
import {
	purgeProcessedDomainEvents,
	queryDomainEvents,
	replayProcessedDomainEvent,
	retryFailedDomainEvent,
} from "../src/query";
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

	it("filters queue health by source module inside the organization", async () => {
		const store = new MemoryEventStore();
		const publisher = createEventPublisher({ store });

		assertOk(
			await publisher.publish({
				type: "human-resources.employee.created.v1",
				sourceModule: "human-resources",
				organizationId: "org-hr-ops",
				actorUserId: "user-hr",
				correlationId: "corr-hr",
				payload: {
					organizationId: "org-hr-ops",
					entityType: "employee",
					entityId: "11111111-1111-4111-8111-111111111111",
					actorId: "user-hr",
					correlationId: "corr-hr",
				},
			}),
		);
		assertOk(
			await publisher.publish({
				type: "identity.org_role.assigned",
				sourceModule: "identity",
				organizationId: "org-hr-ops",
				actorUserId: "user-hr",
				correlationId: "corr-identity",
				payload: {
					roleId: "role-1",
					assignmentId: "assignment-1",
					recipientUserId: "user-1",
					reactivated: false,
				},
			}),
		);

		const page = assertOk(
			await queryDomainEvents(
				{
					organizationId: "org-hr-ops",
					sourceModule: "human-resources",
				},
				store,
			),
		);

		expect(page.total).toBe(1);
		expect(page.entries[0]?.sourceModule).toBe("human-resources");

		const exact = assertOk(
			await queryDomainEvents(
				{
					organizationId: "org-hr-ops",
					id: page.entries[0]?.id,
					sourceModule: "human-resources",
				},
				store,
			),
		);
		expect(exact.total).toBe(1);
		expect(exact.entries[0]?.id).toBe(page.entries[0]?.id);
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

	it("retries failed events only within the owning organization", async () => {
		const store = new MemoryEventStore();
		const publisher = createEventPublisher({ store });
		const event = assertOk(
			await publisher.publish({
				type: "identity.org_role.assigned",
				sourceModule: "identity",
				organizationId: "org-retry",
				actorUserId: "actor-1",
				correlationId: "corr-retry",
				payload: {
					roleId: "role-1",
					assignmentId: "assignment-1",
					recipientUserId: "user-1",
					reactivated: false,
				},
			}),
		);
		assertOk(
			await store.markFailed({
				id: event.id,
				organizationId: "org-retry",
				lastError: "transport unavailable",
			}),
		);

		const crossTenant = await retryFailedDomainEvent(
			{ id: event.id, organizationId: "org-other" },
			store,
		);
		expect(crossTenant.ok).toBe(false);

		const retried = assertOk(
			await retryFailedDomainEvent(
				{ id: event.id, organizationId: "org-retry" },
				store,
			),
		);
		expect(retried.status).toBe("pending");
		expect(retried.attempts).toBe(1);
		expect(retried.lastError).toBeNull();
	});

	it("requires explicit confirmation before replaying a processed event", async () => {
		const store = new MemoryEventStore();
		const publisher = createEventPublisher({ store });
		const event = assertOk(
			await publisher.publish({
				type: "platform.organization.deleted",
				sourceModule: "platform",
				organizationId: "org-replay",
				actorUserId: "actor-1",
				correlationId: "corr-replay",
				payload: {
					organizationId: "org-replay",
					deletedByUserId: "actor-1",
				},
			}),
		);
		assertOk(
			await store.markProcessed({
				id: event.id,
				organizationId: "org-replay",
			}),
		);

		const unconfirmed = await replayProcessedDomainEvent(
			{ id: event.id, organizationId: "org-replay" },
			store,
		);
		expect(unconfirmed.ok).toBe(false);

		const replayed = assertOk(
			await replayProcessedDomainEvent(
				{
					id: event.id,
					organizationId: "org-replay",
					confirmation: "REPLAY_PROCESSED_EVENT",
				},
				store,
			),
		);
		expect(replayed.status).toBe("pending");
		expect(replayed.processedAt).toBeNull();
	});

	it("keeps HR queue pagination bounded under operational load", async () => {
		const store = new MemoryEventStore();
		for (let index = 0; index < 250; index += 1) {
			assertOk(
				await store.append({
					organizationId: "org-load",
					type: "human-resources.employee.created.v1",
					sourceModule: "human-resources",
					correlationId: `corr-load-${index}`,
					actorUserId: "load-actor",
					payload: {
						organizationId: "org-load",
						entityType: "employee",
						entityId: `employee-${index}`,
						actorId: "load-actor",
						correlationId: `corr-load-${index}`,
					},
				}),
			);
		}

		const secondPage = assertOk(
			await queryDomainEvents(
				{
					organizationId: "org-load",
					sourceModule: "human-resources",
					status: "pending",
					page: 2,
					pageSize: 100,
				},
				store,
			),
		);

		expect(secondPage.total).toBe(250);
		expect(secondPage.entries).toHaveLength(100);
		expect(
			secondPage.entries.every((event) => event.status === "pending"),
		).toBe(true);
	});

	it("completes the failed HR event recovery drill", async () => {
		const store = new MemoryEventStore();
		const event = assertOk(
			await store.append({
				organizationId: "org-drill",
				type: "human-resources.employee.created.v1",
				sourceModule: "human-resources",
				correlationId: "corr-drill",
				actorUserId: "drill-actor",
				payload: {
					organizationId: "org-drill",
					entityType: "employee",
					entityId: "employee-drill",
					actorId: "drill-actor",
					correlationId: "corr-drill",
				},
			}),
		);
		assertOk(
			await store.markFailed({
				id: event.id,
				organizationId: "org-drill",
				lastError: "simulated connector outage",
			}),
		);

		const target = assertOk(
			await queryDomainEvents(
				{
					organizationId: "org-drill",
					id: event.id,
					sourceModule: "human-resources",
					status: "failed",
				},
				store,
			),
		);
		expect(target.total).toBe(1);

		assertOk(
			await retryFailedDomainEvent(
				{ organizationId: "org-drill", id: event.id },
				store,
			),
		);
		const claimed = assertOk(
			await store.claimPending({
				organizationId: "org-drill",
				limit: 10,
			}),
		);
		expect(claimed.map((entry) => entry.id)).toContain(event.id);
	});
});
