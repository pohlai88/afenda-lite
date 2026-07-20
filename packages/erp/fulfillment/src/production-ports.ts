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

const FULFILLMENT_MODULE = "fulfillment" as const;

export function createSqlAuditFactPort(): AuditFactPort {
	return {
		async record(input: AuditFactInput): Promise<Result<{ id: string }>> {
			try {
				const [row] = await db
					.insert(platformAuditLog)
					.values({
						...input,
						module: FULFILLMENT_MODULE,
						oldValue: input.oldValue ?? null,
						newValue: input.newValue ?? null,
					})
					.returning({ id: platformAuditLog.id });
				return row === undefined
					? fail("INTERNAL_ERROR", "Audit fact write returned no row")
					: ok({ id: row.id });
			} catch (error) {
				return failFromUnknown(error, "Failed to write fulfillment audit fact");
			}
		},
	};
}

export function createSqlOutboxPort(): OutboxPort {
	return {
		async append(input: OutboxFactInput): Promise<Result<{ id: string }>> {
			const parsed = publishEventCommandSchema.safeParse({
				...input,
				sourceModule: FULFILLMENT_MODULE,
			});
			if (!parsed.success) {
				return fail("BAD_REQUEST", "Invalid fulfillment outbox event", {
					fieldErrors: parsed.error.flatten().fieldErrors,
				});
			}
			try {
				const [row] = await db
					.insert(platformDomainEvent)
					.values({
						organizationId: parsed.data.organizationId,
						type: parsed.data.type,
						sourceModule: FULFILLMENT_MODULE,
						correlationId: parsed.data.correlationId,
						causationId: parsed.data.causationId ?? null,
						actorUserId: parsed.data.actorUserId,
						payload: parsed.data.payload,
						status: "pending",
						attempts: 0,
					})
					.returning({ id: platformDomainEvent.id });
				return row === undefined
					? fail("INTERNAL_ERROR", "Outbox append returned no row")
					: ok({ id: row.id });
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to append fulfillment outbox event",
				);
			}
		},
	};
}

export function createProductionMutationPorts(): MutationPorts {
	return { audit: createSqlAuditFactPort(), outbox: createSqlOutboxPort() };
}
