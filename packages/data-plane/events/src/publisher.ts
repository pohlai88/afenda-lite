import { errorResult, type Result } from "@afenda/errors";
import { resolveEventStore } from "./resolve-store";
import { isKnownEventType, publishEventCommandSchema } from "./schemas";
import type { EventStore } from "./store";
import type { DomainEvent } from "./types";

export interface CreateEventPublisherOptions {
	store?: EventStore;
}

export interface EventPublisher {
	publish: (input: unknown) => Promise<Result<DomainEvent>>;
}

export function createEventPublisher(
	options: CreateEventPublisherOptions = {},
): EventPublisher {
	const store = resolveEventStore(options.store);

	return {
		publish(input: unknown): Promise<Result<DomainEvent>> {
			const parsed = publishEventCommandSchema.safeParse(input);
			if (!parsed.success) {
				return Promise.resolve(
					errorResult.fail("VALIDATION_ERROR", {
						publicMessage: "Invalid event publish input",
					}),
				);
			}

			const command = parsed.data;
			// Catalog + payload already validated by publishEventCommandSchema.
			if (!isKnownEventType(command.type)) {
				return Promise.resolve(
					errorResult.fail("BAD_REQUEST", {
						publicMessage: "The request is invalid",
					}),
				);
			}

			return store.append({
				organizationId: command.organizationId,
				type: command.type,
				sourceModule: command.sourceModule,
				deduplicationKey: command.deduplicationKey ?? null,
				correlationId: command.correlationId,
				causationId: command.causationId ?? null,
				actorUserId: command.actorUserId,
				payload: command.payload,
				metadata: command.metadata ?? null,
			});
		},
	};
}
