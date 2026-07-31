import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import { resolveEventStore } from "./resolve-store";
import { eventDispatchOptionsSchema } from "./schemas";
import type { EventStore } from "./store";
import type {
	ClaimedDomainEvent,
	DomainEvent,
	DomainEventHandlerMap,
} from "./types";

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
	return errorProject.result(
		errorIngress.unknown(error, { operation: "events.dispatch" }),
	).message;
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
	claimed: ClaimedDomainEvent,
	handler: DomainEventHandlerMap[string] | undefined,
	store: EventStore,
): Promise<Result<EventDispatchOutcome>> {
	const { claimToken, event } = claimed;
	if (handler === undefined) {
		const marked = await store.markFailed({
			claimToken,
			id: event.id,
			lastError: `No handler registered for event type: ${event.type}`,
			organizationId: event.organizationId,
		});
		if (!marked.ok) {
			return marked;
		}
		return marked.data === null
			? errorResult.fail("INTERNAL_ERROR")
			: errorResult.ok({
					event: marked.data,
					failed: 1,
					processed: 0,
					skipped: 1,
				});
	}
	try {
		await handler(event);
		const marked = await store.markProcessed({
			claimToken,
			id: event.id,
			organizationId: event.organizationId,
		});
		if (!marked.ok) {
			return marked;
		}
		return marked.data === null
			? errorResult.fail("INTERNAL_ERROR")
			: errorResult.ok({
					event: marked.data,
					failed: 0,
					processed: 1,
					skipped: 0,
				});
	} catch (error) {
		const marked = await store.markFailed({
			claimToken,
			id: event.id,
			organizationId: event.organizationId,
			lastError: errorMessage(error),
		});
		if (!marked.ok) {
			return marked;
		}
		return marked.data === null
			? errorResult.fail("INTERNAL_ERROR")
			: errorResult.ok({
					event: marked.data,
					failed: 1,
					processed: 0,
					skipped: 0,
				});
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
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Invalid event dispatch input",
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
				async (previousResult, claimedEvent) => {
					const accumulated = await previousResult;
					if (!accumulated.ok) {
						return accumulated;
					}

					const outcome = await dispatchEvent(
						claimedEvent,
						handlers[claimedEvent.event.type],
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
					errorResult.ok({ events: [], failed: 0, processed: 0, skipped: 0 }),
				),
			);
			if (!dispatched.ok) {
				return dispatched;
			}

			return errorResult.ok({
				claimed: claimed.length,
				...dispatched.data,
			});
		},
	};
}
