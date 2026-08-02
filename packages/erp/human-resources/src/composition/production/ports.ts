import { audit as afendaAudit } from "@afenda/audit";
import { errorResult, type Result } from "@afenda/errors";
import { events } from "@afenda/events";

import type {
	AuditFactInput,
	AuditFactPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "../../kernel/execution/ports";

const HUMAN_RESOURCES_MODULE = "human-resources" as const;

export function createSqlAuditFactPort(): AuditFactPort {
	const store = afendaAudit.store.drizzle();
	return {
		async record(input: AuditFactInput): Promise<Result<{ id: string }>> {
			const result = await store.write({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				module: HUMAN_RESOURCES_MODULE,
				entity: input.entity,
				entityId: input.entityId,
				action: input.action,
				changes: input.changes,
				oldValue: input.oldValue ?? null,
				newValue: input.newValue ?? null,
			});
			if (!result.ok) {
				return result;
			}
			return errorResult.ok({ id: result.data.id });
		},
	};
}

export function createSqlOutboxPort(): OutboxPort {
	const publisher = events.publisher.create();
	return {
		async append(input: OutboxFactInput): Promise<Result<{ id: string }>> {
			const causationId =
				typeof input.payload.causationId === "string"
					? input.payload.causationId
					: undefined;
			const operation =
				typeof input.payload.operation === "string"
					? input.payload.operation
					: undefined;
			const result = await publisher.publish({
				type: input.type,
				sourceModule: HUMAN_RESOURCES_MODULE,
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				causationId,
				payload: input.payload,
				metadata:
					operation === undefined
						? undefined
						: {
								operation,
							},
			});
			if (!result.ok) {
				return result;
			}
			return errorResult.ok({ id: result.data.id });
		},
	};
}

export function createProductionMutationPorts(): MutationPorts {
	return {
		audit: createSqlAuditFactPort(),
		outbox: createSqlOutboxPort(),
	};
}
