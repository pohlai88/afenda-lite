import { db, platformAuditLog, platformDomainEvent } from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";
import { publishEventCommandSchema } from "@afenda/events";

import type {
	AuditFactInput,
	AuditFactPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "./ports";

const SALES_MODULE = "sales" as const;

export function createSqlAuditFactPort(): AuditFactPort {
	return {
		async record(input: AuditFactInput): Promise<Result<{ id: string }>> {
			try {
				const [row] = await db
					.insert(platformAuditLog)
					.values({
						organizationId: input.organizationId,
						actorUserId: input.actorUserId,
						correlationId: input.correlationId,
						module: SALES_MODULE,
						entity: input.entity,
						entityId: input.entityId,
						action: input.action,
						changes: input.changes,
						oldValue: input.oldValue ?? null,
						newValue: input.newValue ?? null,
					})
					.returning({ id: platformAuditLog.id });

				if (row === undefined) {
					return fail("INTERNAL_ERROR", "audit fact write returned no row");
				}
				return ok({ id: row.id });
			} catch (error) {
				return failFromUnknown(error, "Failed to write sales audit fact");
			}
		},
	};
}

export function createSqlOutboxPort(): OutboxPort {
	return {
		async append(input: OutboxFactInput): Promise<Result<{ id: string }>> {
			const parsed = publishEventCommandSchema.safeParse({
				type: input.type,
				sourceModule: SALES_MODULE,
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				causationId:
					typeof input.payload.causationId === "string"
						? input.payload.causationId
						: undefined,
				payload: input.payload,
			});
			if (!parsed.success) {
				return fail("BAD_REQUEST", "Invalid sales outbox event", {
					fieldErrors: parsed.error.flatten().fieldErrors,
				});
			}

			try {
				const [row] = await db
					.insert(platformDomainEvent)
					.values({
						organizationId: parsed.data.organizationId,
						type: parsed.data.type,
						sourceModule: SALES_MODULE,
						correlationId: parsed.data.correlationId,
						causationId: parsed.data.causationId ?? null,
						actorUserId: parsed.data.actorUserId,
						payload: parsed.data.payload,
						status: "pending",
						attempts: 0,
					})
					.returning({ id: platformDomainEvent.id });

				if (row === undefined) {
					return fail("INTERNAL_ERROR", "outbox append returned no row");
				}
				return ok({ id: row.id });
			} catch (error) {
				return failFromUnknown(error, "Failed to append sales outbox event");
			}
		},
	};
}

export function createProductionMutationPorts(): MutationPorts {
	return {
		audit: createSqlAuditFactPort(),
		outbox: createSqlOutboxPort(),
	};
}
