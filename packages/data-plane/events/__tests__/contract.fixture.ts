import { type DomainEvent, events } from "@afenda/events";
import { PlatformEventSchemas } from "@afenda/events/schemas";

const event: DomainEvent<{ organizationId: string; deletedByUserId: string }> =
	{
		actorUserId: "user-1",
		attempts: 0,
		causationId: null,
		correlationId: "correlation-1",
		id: "event-1",
		lastError: null,
		metadata: null,
		occurredAt: new Date("2026-08-01T00:00:00.000Z"),
		organizationId: "org-1",
		payload: { organizationId: "org-1", deletedByUserId: "user-1" },
		processedAt: null,
		sourceModule: "platform",
		status: "pending",
		type: "platform.organization.deleted",
	};

export const payload = PlatformEventSchemas[
	"platform.organization.deleted"
].parse(event.payload);
export const serialized = events.serialization.serialize(event);
export const parsed = events.serialization.deserialize(serialized);
export const publisher = events.publisher.create();
export const dispatcher = events.dispatcher.create({ handlers: {} });

// @ts-expect-error production consumers cannot inject an event store
events.publisher.create({ store: {} });

// @ts-expect-error the dispatcher accepts handlers, not persistence adapters
events.dispatcher.create({ handlers: {}, store: {} });

// @ts-expect-error claim leases are internal outbox state
export const leakedClaimToken = event.claimToken;
