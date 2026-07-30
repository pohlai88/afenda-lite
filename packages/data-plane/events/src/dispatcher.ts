import { normalizeUnknown } from "@afenda/errors";
import { fail, ok, type Result } from "@afenda/errors/result";
import { resolveEventStore } from "./resolve-store";
import { eventDispatchOptionsSchema } from "./schemas";
import type { EventStore } from "./store";
import type { DomainEvent, DomainEventHandlerMap } from "./types";

export interface CreateEventDispatcherOptions {
	handlers: DomainEventHandlerMap;
	store?: EventStore;
}

export interface EventDispatchSummary {
	claimed: number;
	events: DomainEvent[];
	failed: number;
	processed: number;
	skipped: number;
}

export interface EventDispatcher {
	dispatchPending: (input?: unknown) => Promise<Result<EventDispatchSummary>>;
}

function errorMessage(error: unknown): string {
	return normalizeUnknown(error, "Domain event handler failed").message;
}

interface EventDispatchOutcome {
	event: DomainEvent;
	failed: number;
	processed: number;
	skipped: number;
}

interface EventDispatchAccumulator {
	events: DomainEvent[];
	failed: number;
	processed: number;
	skipped: number;
}

async function dispatchEvent(
	event: DomainEvent,
	handler: DomainEventHandlerMap[string] | undefined,
	store: EventStore,
): Promise<Result<EventDispatchOutcome>> {
	if (handler === undefined) {
		return ok({ event, failed: 0, processed: 0, skipped: 1 });
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
		return marked.data === null
			? fail("INTERNAL_ERROR", `Failed to mark event ${event.id} processed`)
			: ok({ event: marked.data, failed: 0, processed: 1, skipped: 0 });
	} catch (error) {
		const marked = await store.markFailed({
			id: event.id,
			organizationId: event.organizationId,
			lastError: errorMessage(error),
		});
		if (!marked.ok) {
			return marked;
		}
		return marked.data === null
			? fail("INTERNAL_ERROR", `Failed to mark event ${event.id} failed`)
			: ok({ event: marked.data, failed: 1, processed: 0, skipped: 0 });
	}
}

export function createEventDispatcher(
	options: CreateEventDispatcherOptions,
): EventDispatcher {
	const store = resolveEventStore(options.store);
	const { handlers } = options;

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
			const dispatched = await claimed.reduce<
				Promise<Result<EventDispatchAccumulator>>
			>(
				async (previousResult, event) => {
					const accumulated = await previousResult;
					if (!accumulated.ok) {
						return accumulated;
					}

					const outcome = await dispatchEvent(
						event,
						handlers[event.type],
						store,
					);
					if (!outcome.ok) {
						return outcome;
					}
					accumulated.data.events.push(outcome.data.event);
					accumulated.data.processed += outcome.data.processed;
					accumulated.data.failed += outcome.data.failed;
					accumulated.data.skipped += outcome.data.skipped;
					return accumulated;
				},
				Promise.resolve(
					ok({ events: [], failed: 0, processed: 0, skipped: 0 }),
				),
			);
			if (!dispatched.ok) {
				return dispatched;
			}

			return ok({
				claimed: claimed.length,
				...dispatched.data,
			});
		},
	};
}
