import { fail, ok, type Result } from "@afenda/errors/result";
import { resolveEventStore } from "./resolve-store";
import { eventDispatchOptionsSchema } from "./schemas";
import type { EventStore } from "./store";
import type { DomainEvent, DomainEventHandlerMap } from "./types";

export type CreateEventDispatcherOptions = {
	store?: EventStore;
	handlers: DomainEventHandlerMap;
};

export type EventDispatchSummary = {
	claimed: number;
	processed: number;
	failed: number;
	skipped: number;
	events: DomainEvent[];
};

export type EventDispatcher = {
	dispatchPending(input?: unknown): Promise<Result<EventDispatchSummary>>;
};

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return "Domain event handler failed";
}

export function createEventDispatcher(
	options: CreateEventDispatcherOptions,
): EventDispatcher {
	const store = resolveEventStore(options.store);
	const handlers = options.handlers;

	return {
		async dispatchPending(
			input: unknown = {},
		): Promise<Result<EventDispatchSummary>> {
			const parsed = eventDispatchOptionsSchema.safeParse(input);
			if (!parsed.success) {
				return fail("BAD_REQUEST", "Invalid event dispatch input", {
					fieldErrors: parsed.error.flatten().fieldErrors,
				});
			}

			const claimedResult = await store.claimPending(parsed.data);
			if (!claimedResult.ok) {
				return claimedResult;
			}

			const claimed = claimedResult.data;
			let processed = 0;
			let failed = 0;
			let skipped = 0;
			const events: DomainEvent[] = [];

			for (const event of claimed) {
				const handler = handlers[event.type];
				if (handler === undefined) {
					skipped += 1;
					events.push(event);
					continue;
				}

				try {
					await handler(event);
					const marked = await store.markProcessed({
						id: event.id,
						organizationId: event.organizationId,
					});
					if (!marked.ok) {
						return marked;
					}
					if (marked.data === null) {
						return fail(
							"INTERNAL_ERROR",
							`Failed to mark event ${event.id} processed`,
						);
					}
					processed += 1;
					events.push(marked.data);
				} catch (error) {
					const marked = await store.markFailed({
						id: event.id,
						organizationId: event.organizationId,
						lastError: errorMessage(error),
					});
					if (!marked.ok) {
						return marked;
					}
					if (marked.data === null) {
						return fail(
							"INTERNAL_ERROR",
							`Failed to mark event ${event.id} failed`,
						);
					}
					failed += 1;
					events.push(marked.data);
				}
			}

			return ok({
				claimed: claimed.length,
				processed,
				failed,
				skipped,
				events,
			});
		},
	};
}
