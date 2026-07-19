import { fail, ok, type Result } from "@afenda/errors/result";
import { resolveEventStore } from "./resolve-store";
import {
	type EventPage,
	eventPageSchema,
	eventPurgeOptionsSchema,
	eventQueryOptionsSchema,
} from "./schemas";
import type { EventStore } from "./store";

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
