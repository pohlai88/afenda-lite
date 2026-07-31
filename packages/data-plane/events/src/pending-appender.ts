import type { NeonHttpSql } from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";

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
					${event.organizationId},
					${event.type},
					${event.sourceModule},
					${event.deduplicationKey},
					${event.correlationId},
					${event.causationId ?? null},
					${event.actorUserId},
					${JSON.stringify(event.payload)}::jsonb,
					${JSON.stringify(event.metadata)}::jsonb,
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
