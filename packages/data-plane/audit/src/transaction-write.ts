import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";

import { serializeAuditMetadata } from "./event-context";
import { prepareAuditWrite } from "./prepare-write";
import { recordAuditCommandSchema } from "./schemas";
import { observeSynchronousAuditOperation } from "./telemetry";
import type { PreparedAuditWriteInput } from "./types";

type AuditSqlParameter = null | string;

export type AuditSqlTag<Query> = (
	strings: TemplateStringsArray,
	...values: AuditSqlParameter[]
) => Query;

export interface BuildTransactionalAuditInsertOptions<Query> {
	id?: unknown;
	input: unknown;
	sql: AuditSqlTag<Query>;
}

/** Validated and JSON-serialized values for guarded CTE audit inserts. */
export type PreparedTransactionalAuditInsertValues = Pick<
	PreparedAuditWriteInput,
	| "action"
	| "actorUserId"
	| "correlationId"
	| "entity"
	| "entityId"
	| "module"
	| "organizationId"
> & {
	changesJson: string;
	ipAddress: string | null;
	metadataJson: string;
	newValueJson: string | null;
	oldValueJson: string | null;
	userAgent: string | null;
};

/**
 * Validated values for a guarded CTE whose entity ID comes from the mutation
 * row rather than caller-controlled input.
 */
export type PreparedDerivedEntityAuditInsertValues = Omit<
	PreparedTransactionalAuditInsertValues,
	"entityId"
>;

const auditIdSchema = z.string().uuid();
const derivedEntityAuditCommandSchema = recordAuditCommandSchema.omit({
	entityId: true,
});
const DERIVED_ENTITY_VALIDATION_SENTINEL = "derived-entity-row";

function prepareTransactionalAuditInsertValuesUnobserved(
	input: unknown,
): Result<PreparedTransactionalAuditInsertValues> {
	const prepared = prepareAuditWrite(input);
	if (!prepared.ok) {
		return prepared;
	}

	const entry = prepared.data;
	return errorResult.ok({
		organizationId: entry.organizationId,
		actorUserId: entry.actorUserId,
		correlationId: entry.correlationId,
		module: entry.module,
		entity: entry.entity,
		entityId: entry.entityId,
		action: entry.action,
		changesJson: JSON.stringify(entry.changes),
		oldValueJson:
			entry.oldValue === null ? null : JSON.stringify(entry.oldValue),
		newValueJson:
			entry.newValue === null ? null : JSON.stringify(entry.newValue),
		metadataJson: JSON.stringify(
			serializeAuditMetadata(entry.metadata ?? null, entry.eventContext),
		),
		ipAddress: entry.ipAddress,
		userAgent: entry.userAgent,
	});
}

/**
 * Prepare bounded, masked, V1-serialized values for an audit INSERT whose
 * mutation guard must remain inside a caller-owned CTE.
 */
export function prepareTransactionalAuditInsertValues(
	input: unknown,
): Result<PreparedTransactionalAuditInsertValues> {
	return observeSynchronousAuditOperation("transaction_build", () =>
		prepareTransactionalAuditInsertValuesUnobserved(input),
	);
}

/**
 * Prepare bounded, masked, V1-serialized values when the guarded mutation CTE
 * is the source of truth for entity_id. The returned contract deliberately has
 * no entityId field, preventing a placeholder from being persisted.
 */
export function prepareDerivedEntityAuditInsertValues(
	input: unknown,
): Result<PreparedDerivedEntityAuditInsertValues> {
	return observeSynchronousAuditOperation("transaction_build", () => {
		const parsed = derivedEntityAuditCommandSchema.safeParse(input);
		if (!parsed.success) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid audit record input",
			});
		}

		const prepared = prepareTransactionalAuditInsertValuesUnobserved({
			...parsed.data,
			entityId: DERIVED_ENTITY_VALIDATION_SENTINEL,
		});
		if (!prepared.ok) {
			return prepared;
		}

		const { entityId: _validatedSentinel, ...derivedValues } = prepared.data;
		return errorResult.ok(derivedValues);
	});
}

/**
 * Build one validated audit INSERT for a caller-owned synchronous transaction
 * batch. Recorded chronology remains database-owned via the created_at default.
 */
export function buildTransactionalAuditInsert<Query>(
	options: BuildTransactionalAuditInsertOptions<Query>,
): Result<Query> {
	return observeSynchronousAuditOperation("transaction_build", () =>
		buildTransactionalAuditInsertUnobserved(options),
	);
}

function buildTransactionalAuditInsertUnobserved<Query>(
	options: BuildTransactionalAuditInsertOptions<Query>,
): Result<Query> {
	const prepared = prepareTransactionalAuditInsertValuesUnobserved(
		options.input,
	);
	if (!prepared.ok) {
		return prepared;
	}

	const parsedId =
		options.id === undefined ? undefined : auditIdSchema.safeParse(options.id);
	if (parsedId !== undefined && !parsedId.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invalid audit record id",
		});
	}

	const entry = prepared.data;

	if (parsedId === undefined) {
		return errorResult.ok(options.sql`
			INSERT INTO platform_audit_log (
				organization_id, actor_user_id, correlation_id, module, entity,
				entity_id, action, changes, old_value, new_value, metadata,
				ip_address, user_agent
			)
			VALUES (
				${entry.organizationId}, ${entry.actorUserId}, ${entry.correlationId},
				${entry.module}, ${entry.entity}, ${entry.entityId}, ${entry.action},
				${entry.changesJson}::jsonb, ${entry.oldValueJson}::jsonb,
				${entry.newValueJson}::jsonb, ${entry.metadataJson}::jsonb,
				${entry.ipAddress ?? null}, ${entry.userAgent ?? null}
			)
			RETURNING id
		`);
	}

	return errorResult.ok(options.sql`
		INSERT INTO platform_audit_log (
			id, organization_id, actor_user_id, correlation_id, module, entity,
			entity_id, action, changes, old_value, new_value, metadata,
			ip_address, user_agent
		)
		VALUES (
			${parsedId.data}, ${entry.organizationId}, ${entry.actorUserId},
			${entry.correlationId}, ${entry.module}, ${entry.entity},
			${entry.entityId}, ${entry.action}, ${entry.changesJson}::jsonb,
			${entry.oldValueJson}::jsonb, ${entry.newValueJson}::jsonb,
			${entry.metadataJson}::jsonb, ${entry.ipAddress ?? null},
			${entry.userAgent ?? null}
		)
		RETURNING id
	`);
}
