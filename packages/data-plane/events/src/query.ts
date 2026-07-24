import { fail, ok, type Result } from "@afenda/errors/result";
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
		return fail("BAD_REQUEST", "Invalid event query input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
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

	return ok(page);
}

/**
 * Purge processed outbox rows older than a cutoff (org-scoped).
 */
export async function purgeProcessedDomainEvents(
	input: unknown,
	store?: EventStore,
): Promise<Result<number>> {
	const parsed = eventPurgeOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid event purge input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
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
		return fail("BAD_REQUEST", "Invalid event retry input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
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
		return fail("NOT_FOUND", "Failed domain event not found");
	}
	return ok(result.data);
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
		return fail("BAD_REQUEST", "Invalid event replay input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
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
		return fail("NOT_FOUND", "Processed domain event not found");
	}
	return ok(result.data);
}
