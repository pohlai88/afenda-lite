import { fail, type Result } from "@afenda/errors/result";
import { resolveEventStore } from "./resolve-store";
import { isKnownEventType, publishEventCommandSchema } from "./schemas";
import type { EventStore } from "./store";
import type { DomainEvent } from "./types";

export type CreateEventPublisherOptions = {
	store?: EventStore;
};

export type EventPublisher = {
	publish(input: unknown): Promise<Result<DomainEvent>>;
};

export function createEventPublisher(
	options: CreateEventPublisherOptions = {},
): EventPublisher {
	const store = resolveEventStore(options.store);

	return {
		async publish(input: unknown): Promise<Result<DomainEvent>> {
			const parsed = publishEventCommandSchema.safeParse(input);
			if (!parsed.success) {
				return fail("BAD_REQUEST", "Invalid event publish input", {
					fieldErrors: parsed.error.flatten().fieldErrors,
				});
			}

			const command = parsed.data;
			// Catalog + payload already validated by publishEventCommandSchema.
			if (!isKnownEventType(command.type)) {
				return fail("BAD_REQUEST", `Unknown event type: ${command.type}`);
			}

			return store.append({
				organizationId: command.organizationId,
				type: command.type,
				sourceModule: command.sourceModule,
				correlationId: command.correlationId,
				causationId: command.causationId ?? null,
				actorUserId: command.actorUserId,
				payload: command.payload,
				metadata: command.metadata ?? null,
			});
		},
	};
}
