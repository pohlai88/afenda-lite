import {
	database as afendaDatabase,
	and,
	count,
	desc,
	eq,
	gte,
	lt,
	lte,
	platformDomainEvent,
	sql,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import { mapDomainEventRow } from "./map-row";
import { EVENT_LIFECYCLE_POLICY } from "./semantic-registry";
import type { EventStore } from "./store";
import type {
	ClaimedDomainEvent,
	DomainEvent,
	DomainEventClaimOptions,
	DomainEventMarkFailedInput,
	DomainEventMarkProcessedInput,
	DomainEventPurgeOptions,
	DomainEventQueryOptions,
	DomainEventRequeueInput,
	DomainEventWriteInput,
} from "./types";

function mapRows(
	rows: Parameters<typeof mapDomainEventRow>[0][],
): Result<DomainEvent[]> {
	const entries: DomainEvent[] = [];
	for (const row of rows) {
		const mapped = mapDomainEventRow(row);
		if (!mapped.ok) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		entries.push(mapped.data);
	}
	return errorResult.ok(entries);
}

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

function buildFilterWhere(options: DomainEventQueryOptions) {
	const predicates = [
		eq(platformDomainEvent.organizationId, options.organizationId),
	];
	if (options.id !== undefined) {
		predicates.push(eq(platformDomainEvent.id, options.id));
	}
	if (options.type !== undefined) {
		predicates.push(eq(platformDomainEvent.type, options.type));
	}
	if (options.sourceModule !== undefined) {
		predicates.push(eq(platformDomainEvent.sourceModule, options.sourceModule));
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mapClaimedRow(row: unknown): Result<ClaimedDomainEvent> {
	if (!isRecord(row) || typeof row.claimToken !== "string") {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const mapped = mapDomainEventRow({
		actorUserId: String(row.actorUserId ?? ""),
		attempts: Number(row.attempts),
		causationId: typeof row.causationId === "string" ? row.causationId : null,
		claimedAt: row.claimedAt ? new Date(String(row.claimedAt)) : null,
		correlationId: String(row.correlationId ?? ""),
		createdAt: new Date(String(row.createdAt)),
		deduplicationKey:
			typeof row.deduplicationKey === "string" ? row.deduplicationKey : null,
		id: String(row.id ?? ""),
		lastError: typeof row.lastError === "string" ? row.lastError : null,
		metadata: row.metadata,
		organizationId: String(row.organizationId ?? ""),
		payload: row.payload,
		processedAt: row.processedAt ? new Date(String(row.processedAt)) : null,
		sourceModule: String(row.sourceModule ?? ""),
		status: String(row.status ?? ""),
		type: String(row.type ?? ""),
	});
	return mapped.ok
		? errorResult.ok({ claimToken: row.claimToken, event: mapped.data })
		: errorResult.fail("INTERNAL_ERROR");
}

function mapClaimedRows(
	rows: readonly unknown[],
): Result<ClaimedDomainEvent[]> {
	const claimed: ClaimedDomainEvent[] = [];
	for (const row of rows) {
		const mapped = mapClaimedRow(row);
		if (!mapped.ok) {
			return mapped;
		}
		claimed.push(mapped.data);
	}
	return errorResult.ok(claimed);
}

export class DrizzleEventStore implements EventStore {
	async append(entry: DomainEventWriteInput): Promise<Result<DomainEvent>> {
		try {
			const [row] = await afendaDatabase.client
				.insert(platformDomainEvent)
				.values({
					organizationId: entry.organizationId,
					type: entry.type,
					sourceModule: entry.sourceModule,
					deduplicationKey: entry.deduplicationKey ?? null,
					correlationId: entry.correlationId,
					causationId: entry.causationId ?? null,
					actorUserId: entry.actorUserId,
					payload: entry.payload,
					metadata: entry.metadata ?? null,
					status: "pending",
					attempts: 0,
					createdAt: entry.createdAt,
				})
				.onConflictDoNothing({
					target: [
						platformDomainEvent.organizationId,
						platformDomainEvent.sourceModule,
						platformDomainEvent.type,
						platformDomainEvent.deduplicationKey,
					],
					where: sql`${platformDomainEvent.deduplicationKey} IS NOT NULL`,
				})
				.returning();

			let resolvedRow = row;
			if (
				resolvedRow === undefined &&
				entry.deduplicationKey !== undefined &&
				entry.deduplicationKey !== null
			) {
				[resolvedRow] = await afendaDatabase.client
					.select()
					.from(platformDomainEvent)
					.where(
						and(
							eq(platformDomainEvent.organizationId, entry.organizationId),
							eq(platformDomainEvent.sourceModule, entry.sourceModule),
							eq(platformDomainEvent.type, entry.type),
							eq(platformDomainEvent.deduplicationKey, entry.deduplicationKey),
						),
					)
					.limit(1);
			}

			if (resolvedRow === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			const mapped = mapDomainEventRow(resolvedRow);
			if (!mapped.ok) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			return errorResult.ok(mapped.data);
		} catch (error) {
			return failFromPersistence(error, "Failed to append domain event");
		}
	}

	async query(
		options: DomainEventQueryOptions,
	): Promise<Result<DomainEvent[]>> {
		try {
			const where = buildFilterWhere(options);
			if (where === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			const offset = (options.page - 1) * options.pageSize;
			const rows = await afendaDatabase.client
				.select()
				.from(platformDomainEvent)
				.where(where)
				.orderBy(desc(platformDomainEvent.createdAt))
				.limit(options.pageSize)
				.offset(offset);

			return mapRows(rows);
		} catch (error) {
			return failFromPersistence(error, "Failed to query domain events");
		}
	}

	async count(options: DomainEventQueryOptions): Promise<Result<number>> {
		try {
			const where = buildFilterWhere(options);
			if (where === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			const [row] = await afendaDatabase.client
				.select({ value: count() })
				.from(platformDomainEvent)
				.where(where);

			return errorResult.ok(Number(row?.value ?? 0));
		} catch (error) {
			return failFromPersistence(error, "Failed to count domain events");
		}
	}

	async claimPending(
		options: DomainEventClaimOptions,
	): Promise<Result<ClaimedDomainEvent[]>> {
		try {
			const claimToken = crypto.randomUUID();
			const staleBefore = new Date(
				Date.now() - EVENT_LIFECYCLE_POLICY.claimLeaseMs,
			);
			const result = await afendaDatabase.client.execute(sql`
			WITH candidates AS (
				SELECT id
				FROM platform_domain_event
				WHERE platform_domain_event.organization_id = ${options.organizationId}
						AND attempts < ${EVENT_LIFECYCLE_POLICY.maxAttempts}
						AND (
							status = 'pending'
							OR (status = 'processing' AND claimed_at <= ${staleBefore})
						)
					ORDER BY created_at ASC
					FOR UPDATE SKIP LOCKED
					LIMIT ${options.limit}
				)
				UPDATE platform_domain_event AS event
				SET status = 'processing',
					attempts = event.attempts + 1,
					claim_token = ${claimToken},
					claimed_at = NOW()
				FROM candidates
				WHERE event.id = candidates.id
					AND event.organization_id = ${options.organizationId}
				RETURNING
					event.id,
					event.organization_id AS "organizationId",
					event.type,
					event.source_module AS "sourceModule",
					event.deduplication_key AS "deduplicationKey",
					event.correlation_id AS "correlationId",
					event.causation_id AS "causationId",
					event.actor_user_id AS "actorUserId",
					event.payload,
					event.metadata,
					event.status,
					event.attempts,
					event.last_error AS "lastError",
					event.processed_at AS "processedAt",
					event.claimed_at AS "claimedAt",
					event.claim_token AS "claimToken",
					event.created_at AS "createdAt"
			`);

			return mapClaimedRows(result.rows);
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to claim pending domain events",
			);
		}
	}

	async markProcessed(
		input: DomainEventMarkProcessedInput,
	): Promise<Result<DomainEvent | null>> {
		try {
			const processedAt = input.processedAt ?? new Date();
			const [row] = await afendaDatabase.client
				.update(platformDomainEvent)
				.set({
					status: "processed",
					processedAt,
					lastError: null,
					claimToken: null,
					claimedAt: null,
				})
				.where(
					and(
						eq(platformDomainEvent.id, input.id),
						eq(platformDomainEvent.organizationId, input.organizationId),
						eq(platformDomainEvent.status, "processing"),
						eq(platformDomainEvent.claimToken, input.claimToken),
					),
				)
				.returning();

			if (row === undefined) {
				return errorResult.ok(null);
			}

			const mapped = mapDomainEventRow(row);
			if (!mapped.ok) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to mark domain event processed",
			);
		}
	}

	async markFailed(
		input: DomainEventMarkFailedInput,
	): Promise<Result<DomainEvent | null>> {
		try {
			const [row] = await afendaDatabase.client
				.update(platformDomainEvent)
				.set({
					status: "failed",
					lastError: input.lastError,
					claimToken: null,
					claimedAt: null,
				})
				.where(
					and(
						eq(platformDomainEvent.id, input.id),
						eq(platformDomainEvent.organizationId, input.organizationId),
						eq(platformDomainEvent.status, "processing"),
						eq(platformDomainEvent.claimToken, input.claimToken),
					),
				)
				.returning();

			if (row === undefined) {
				return errorResult.ok(null);
			}

			const mapped = mapDomainEventRow(row);
			if (!mapped.ok) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return failFromPersistence(error, "Failed to mark domain event failed");
		}
	}

	async requeue(
		input: DomainEventRequeueInput,
	): Promise<Result<DomainEvent | null>> {
		try {
			const [row] = await afendaDatabase.client
				.update(platformDomainEvent)
				.set({
					status: "pending",
					lastError: null,
					processedAt: null,
					claimToken: null,
					claimedAt: null,
				})
				.where(
					and(
						eq(platformDomainEvent.id, input.id),
						eq(platformDomainEvent.organizationId, input.organizationId),
						eq(platformDomainEvent.status, input.fromStatus),
					),
				)
				.returning();

			if (row === undefined) {
				return errorResult.ok(null);
			}

			const mapped = mapDomainEventRow(row);
			if (!mapped.ok) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return failFromPersistence(error, "Failed to requeue domain event");
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
				return errorResult.fail("INTERNAL_ERROR");
			}

			const rows = await afendaDatabase.client
				.delete(platformDomainEvent)
				.where(where)
				.returning({ id: platformDomainEvent.id });

			return errorResult.ok(rows.length);
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to purge processed domain events",
			);
		}
	}
}

export function createDrizzleEventStore(): EventStore {
	return new DrizzleEventStore();
}
