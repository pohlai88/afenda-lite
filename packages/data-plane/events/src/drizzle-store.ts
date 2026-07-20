import {
	and,
	asc,
	count,
	db,
	desc,
	eq,
	gte,
	lt,
	lte,
	platformDomainEvent,
	sql,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import { mapDomainEventRow } from "./map-row";
import type { EventStore } from "./store";
import type {
	DomainEvent,
	DomainEventClaimOptions,
	DomainEventMarkFailedInput,
	DomainEventMarkProcessedInput,
	DomainEventPurgeOptions,
	DomainEventQueryOptions,
	DomainEventWriteInput,
} from "./types";

function mapRows(
	rows: Parameters<typeof mapDomainEventRow>[0][],
): Result<DomainEvent[]> {
	const entries: DomainEvent[] = [];
	for (const row of rows) {
		const mapped = mapDomainEventRow(row);
		if (!mapped.ok) {
			return fail(
				"INTERNAL_ERROR",
				`domain event row mapping failed: ${mapped.reason}`,
			);
		}
		entries.push(mapped.data);
	}
	return ok(entries);
}

function buildFilterWhere(options: DomainEventQueryOptions) {
	const predicates = [
		eq(platformDomainEvent.organizationId, options.organizationId),
	];
	if (options.type !== undefined) {
		predicates.push(eq(platformDomainEvent.type, options.type));
	}
	if (options.status !== undefined) {
		predicates.push(eq(platformDomainEvent.status, options.status));
	}
	if (options.correlationId !== undefined) {
		predicates.push(
			eq(platformDomainEvent.correlationId, options.correlationId),
		);
	}
	if (options.from !== undefined) {
		predicates.push(gte(platformDomainEvent.createdAt, options.from));
	}
	if (options.to !== undefined) {
		predicates.push(lte(platformDomainEvent.createdAt, options.to));
	}
	return and(...predicates);
}

export class DrizzleEventStore implements EventStore {
	async append(entry: DomainEventWriteInput): Promise<Result<DomainEvent>> {
		try {
			const [row] = await db
				.insert(platformDomainEvent)
				.values({
					organizationId: entry.organizationId,
					type: entry.type,
					sourceModule: entry.sourceModule,
					correlationId: entry.correlationId,
					causationId: entry.causationId ?? null,
					actorUserId: entry.actorUserId,
					payload: entry.payload,
					metadata: entry.metadata ?? null,
					status: "pending",
					attempts: 0,
					createdAt: entry.createdAt,
				})
				.returning();

			if (row === undefined) {
				return fail("INTERNAL_ERROR", "domain event append returned no row");
			}

			const mapped = mapDomainEventRow(row);
			if (!mapped.ok) {
				return fail(
					"INTERNAL_ERROR",
					`domain event append returned unreadable row: ${mapped.reason}`,
				);
			}

			return ok(mapped.data);
		} catch (error) {
			return failFromUnknown(error, "Failed to append domain event");
		}
	}

	async query(
		options: DomainEventQueryOptions,
	): Promise<Result<DomainEvent[]>> {
		try {
			const where = buildFilterWhere(options);
			if (where === undefined) {
				return fail(
					"INTERNAL_ERROR",
					"domain event query where clause missing",
				);
			}

			const offset = (options.page - 1) * options.pageSize;
			const rows = await db
				.select()
				.from(platformDomainEvent)
				.where(where)
				.orderBy(desc(platformDomainEvent.createdAt))
				.limit(options.pageSize)
				.offset(offset);

			return mapRows(rows);
		} catch (error) {
			return failFromUnknown(error, "Failed to query domain events");
		}
	}

	async count(options: DomainEventQueryOptions): Promise<Result<number>> {
		try {
			const where = buildFilterWhere(options);
			if (where === undefined) {
				return fail(
					"INTERNAL_ERROR",
					"domain event count where clause missing",
				);
			}

			const [row] = await db
				.select({ value: count() })
				.from(platformDomainEvent)
				.where(where);

			return ok(Number(row?.value ?? 0));
		} catch (error) {
			return failFromUnknown(error, "Failed to count domain events");
		}
	}

	async claimPending(
		options: DomainEventClaimOptions,
	): Promise<Result<DomainEvent[]>> {
		try {
			const predicates = [eq(platformDomainEvent.status, "pending")];
			if (options.organizationId !== undefined) {
				predicates.push(
					eq(platformDomainEvent.organizationId, options.organizationId),
				);
			}
			const where = and(...predicates);
			if (where === undefined) {
				return fail(
					"INTERNAL_ERROR",
					"domain event claim where clause missing",
				);
			}

			const rows = await db
				.select()
				.from(platformDomainEvent)
				.where(where)
				.orderBy(asc(platformDomainEvent.createdAt))
				.limit(options.limit);

			return mapRows(rows);
		} catch (error) {
			return failFromUnknown(error, "Failed to claim pending domain events");
		}
	}

	async markProcessed(
		input: DomainEventMarkProcessedInput,
	): Promise<Result<DomainEvent | null>> {
		try {
			const processedAt = input.processedAt ?? new Date();
			const [row] = await db
				.update(platformDomainEvent)
				.set({
					status: "processed",
					processedAt,
					lastError: null,
				})
				.where(
					and(
						eq(platformDomainEvent.id, input.id),
						eq(platformDomainEvent.organizationId, input.organizationId),
					),
				)
				.returning();

			if (row === undefined) {
				return ok(null);
			}

			const mapped = mapDomainEventRow(row);
			if (!mapped.ok) {
				return fail(
					"INTERNAL_ERROR",
					`domain event markProcessed returned unreadable row: ${mapped.reason}`,
				);
			}
			return ok(mapped.data);
		} catch (error) {
			return failFromUnknown(error, "Failed to mark domain event processed");
		}
	}

	async markFailed(
		input: DomainEventMarkFailedInput,
	): Promise<Result<DomainEvent | null>> {
		try {
			const [row] = await db
				.update(platformDomainEvent)
				.set({
					status: "failed",
					lastError: input.lastError,
					attempts: sql`${platformDomainEvent.attempts} + 1`,
				})
				.where(
					and(
						eq(platformDomainEvent.id, input.id),
						eq(platformDomainEvent.organizationId, input.organizationId),
					),
				)
				.returning();

			if (row === undefined) {
				return ok(null);
			}

			const mapped = mapDomainEventRow(row);
			if (!mapped.ok) {
				return fail(
					"INTERNAL_ERROR",
					`domain event markFailed returned unreadable row: ${mapped.reason}`,
				);
			}
			return ok(mapped.data);
		} catch (error) {
			return failFromUnknown(error, "Failed to mark domain event failed");
		}
	}

	async purgeProcessed(
		options: DomainEventPurgeOptions,
	): Promise<Result<number>> {
		try {
			const where = and(
				eq(platformDomainEvent.organizationId, options.organizationId),
				eq(platformDomainEvent.status, "processed"),
				lt(platformDomainEvent.createdAt, options.olderThan),
			);
			if (where === undefined) {
				return fail(
					"INTERNAL_ERROR",
					"domain event purge where clause missing",
				);
			}

			const rows = await db
				.delete(platformDomainEvent)
				.where(where)
				.returning({ id: platformDomainEvent.id });

			return ok(rows.length);
		} catch (error) {
			return failFromUnknown(error, "Failed to purge processed domain events");
		}
	}
}

export function createDrizzleEventStore(): EventStore {
	return new DrizzleEventStore();
}
