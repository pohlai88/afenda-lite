import { domainEventSchema } from "./schemas";
import { eventDefinition, isRegisteredEventType } from "./semantic-registry";
import type { DomainEvent } from "./types";

export function serializeDomainEvent(event: DomainEvent): string {
	const parsed = domainEventSchema.parse(event);
	if (!isRegisteredEventType(parsed.type)) {
		throw new TypeError("Cannot serialize an unregistered event type");
	}
	const payload = eventDefinition(parsed.type).schema.parse(parsed.payload);
	return JSON.stringify({
		...parsed,
		occurredAt: parsed.occurredAt.toISOString(),
		payload,
		processedAt: parsed.processedAt?.toISOString() ?? null,
	});
}

export function deserializeDomainEvent(serialized: string): DomainEvent {
	const parsedJson: unknown = JSON.parse(serialized);
	const event = domainEventSchema.parse(parsedJson);
	if (!isRegisteredEventType(event.type)) {
		throw new TypeError("Cannot deserialize an unregistered event type");
	}
	const payload = eventDefinition(event.type).schema.parse(event.payload);
	return Object.freeze({ ...event, payload });
}
