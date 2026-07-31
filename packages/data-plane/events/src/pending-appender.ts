import type { NeonHttpSql } from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";

import { publishEventCommandSchema } from "./schemas";
import type { EventSourceModule } from "./types";

export type PendingDomainEventWriteInput = Readonly<{
	organizationId: string;
	type: string;
	sourceModule: EventSourceModule;
	deduplicationKey: string;
	correlationId: string;
	causationId?: string;
	actorUserId: string;
	payload: unknown;
	metadata: Readonly<Record<string, unknown>>;
}>;

export type PendingDomainEventTransactionStatement = (
	database: unknown,
) => unknown;

export type PendingDomainEventTransactionExecutor = (
	buildQueries: (sql: NeonHttpSql) => ReturnType<NeonHttpSql>[],
) => Promise<unknown>;

export type PendingDomainEventAppender = Readonly<{
	append: (
		events: readonly PendingDomainEventWriteInput[],
	) => Promise<Result<void>>;
	createStatement: (
		event: PendingDomainEventWriteInput,
	) => PendingDomainEventTransactionStatement;
}>;

export function createPendingDomainEventAppender(dependencies: {
	executeTransaction: PendingDomainEventTransactionExecutor;
}): PendingDomainEventAppender {
	function createStatement(
		event: PendingDomainEventWriteInput,
	): PendingDomainEventTransactionStatement {
		const parsed = publishEventCommandSchema.parse(event);
		return (database) => {
			const sql = database as NeonHttpSql;
			return sql`
				INSERT INTO platform_domain_event (
					organization_id,
					type,
					source_module,
					deduplication_key,
					correlation_id,
					causation_id,
					actor_user_id,
					payload,
					metadata,
					status
				)
				VALUES (
					${parsed.organizationId},
					${parsed.type},
					${parsed.sourceModule},
					${parsed.deduplicationKey ?? null},
					${parsed.correlationId},
					${parsed.causationId ?? null},
					${parsed.actorUserId},
					${JSON.stringify(parsed.payload)}::jsonb,
					${JSON.stringify(parsed.metadata ?? {})}::jsonb,
					${"pending"}
				)
				ON CONFLICT (
					organization_id,
					source_module,
					type,
					deduplication_key
				)
				WHERE deduplication_key IS NOT NULL
				DO NOTHING
			`;
		};
	}

	return Object.freeze({
		async append(
			events: readonly PendingDomainEventWriteInput[],
		): Promise<Result<void>> {
			if (events.length === 0) {
				return errorResult.ok(undefined);
			}
			for (const event of events) {
				if (!publishEventCommandSchema.safeParse(event).success) {
					return errorResult.fail("VALIDATION_ERROR", {
						publicMessage: "Invalid pending domain event",
					});
				}
			}
			await dependencies.executeTransaction(
				(sql) =>
					events.map((event) =>
						createStatement(event)(sql),
					) as ReturnType<NeonHttpSql>[],
			);
			return errorResult.ok(undefined);
		},
		createStatement,
	});
}
