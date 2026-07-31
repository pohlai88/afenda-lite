import { errorResult, type Result } from "@afenda/errors";
import { resolveEventStore } from "./resolve-store";
import {
	type EventPage,
	eventPageSchema,
	eventPurgeOptionsSchema,
	eventQueryOptionsSchema,
	eventReplayOptionsSchema,
	eventRetryOptionsSchema,
} from "./schemas";
import type { EventStore } from "./store";
import type { DomainEvent } from "./types";

/**
 * Paginated org-scoped domain-event query with total.
 */
export async function queryDomainEvents(
	input: unknown,
	store?: EventStore,
): Promise<Result<EventPage>> {
	const parsed = eventQueryOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid event query input",
		});
	}

	const options = parsed.data;
	const resolved = resolveEventStore(store);

	const [entriesResult, totalResult] = await Promise.all([
		resolved.query(options),
		resolved.count(options),
	]);

	if (!entriesResult.ok) {
		return entriesResult;
	}
	if (!totalResult.ok) {
		return totalResult;
	}

	const page = eventPageSchema.parse({
		entries: entriesResult.data,
		total: totalResult.data,
		page: options.page,
		pageSize: options.pageSize,
	});

	return errorResult.ok(page);
}

/**
 * Purge processed outbox rows older than a cutoff (org-scoped).
 */
export function purgeProcessedDomainEvents(
	input: unknown,
	store?: EventStore,
): Promise<Result<number>> {
	const parsed = eventPurgeOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid event purge input",
			}),
		);
	}

	return resolveEventStore(store).purgeProcessed(parsed.data);
}

/**
 * Retry a failed event. The org predicate and expected failed state prevent
 * cross-tenant or stale-state requeues.
 */
export async function retryFailedDomainEvent(
	input: unknown,
	store?: EventStore,
): Promise<Result<DomainEvent>> {
	const parsed = eventRetryOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid event retry input",
		});
	}

	const result = await resolveEventStore(store).requeue({
		...parsed.data,
		fromStatus: "failed",
	});
	if (!result.ok) {
		return result;
	}
	if (result.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Failed domain event not found",
		});
	}
	return errorResult.ok(result.data);
}

/**
 * Explicitly replay a processed event. A literal confirmation is required
 * because downstream handlers must be idempotent before operators use this.
 */
export async function replayProcessedDomainEvent(
	input: unknown,
	store?: EventStore,
): Promise<Result<DomainEvent>> {
	const parsed = eventReplayOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid event replay input",
		});
	}

	const result = await resolveEventStore(store).requeue({
		id: parsed.data.id,
		organizationId: parsed.data.organizationId,
		fromStatus: "processed",
	});
	if (!result.ok) {
		return result;
	}
	if (result.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Processed domain event not found",
		});
	}
	return errorResult.ok(result.data);
}
