import { createEventDispatcher } from "./dispatcher";
import { generateCausationId, generateCorrelationId } from "./ids";
import { createPendingDomainEventAppender } from "./pending-appender";
import { createEventPublisher } from "./publisher";
import {
	purgeProcessedDomainEvents,
	queryDomainEvents,
	replayProcessedDomainEvent,
	retryFailedDomainEvent,
} from "./query";
import { eventDefinition, isRegisteredEventType } from "./semantic-registry";
import { deserializeDomainEvent, serializeDomainEvent } from "./serialization";
import type { DomainEventHandlerMap } from "./types";

/** Permanent consumer facade for the event registry and outbox lifecycle. */
export const events = Object.freeze({
	dispatcher: Object.freeze({
		create: (input: { handlers: DomainEventHandlerMap }) =>
			createEventDispatcher({ handlers: input.handlers }),
	}),
	ids: Object.freeze({
		causation: generateCausationId,
		correlation: generateCorrelationId,
	}),
	outbox: Object.freeze({ createAppender: createPendingDomainEventAppender }),
	publisher: Object.freeze({ create: () => createEventPublisher() }),
	query: Object.freeze({
		page: (input: unknown) => queryDomainEvents(input),
		purgeProcessed: (input: unknown) => purgeProcessedDomainEvents(input),
		replayProcessed: (input: unknown) => replayProcessedDomainEvent(input),
		retryFailed: (input: unknown) => retryFailedDomainEvent(input),
	}),
	registry: Object.freeze({
		isType: isRegisteredEventType,
		sourceModule(type: string) {
			return isRegisteredEventType(type)
				? eventDefinition(type).sourceModule
				: undefined;
		},
		validatePayload(type: string, payload: unknown) {
			return isRegisteredEventType(type)
				? eventDefinition(type).schema.safeParse(payload)
				: Object.freeze({ success: false as const });
		},
	}),
	serialization: Object.freeze({
		deserialize: deserializeDomainEvent,
		serialize: serializeDomainEvent,
	}),
});
