import type { HumanResourcesCommandId } from "../module-ids";

/**
 * Request-scoped mutation side-effect metadata.
 *
 * `correlationId` is the caller-supplied trace id (never a command constant).
 * `operationId` is canonical; `operation` is normalized at `buildMutationMeta`.
 */
export type HumanResourcesMutationMeta = {
	correlationId: string;
	operationId: HumanResourcesCommandId;
	/** @deprecated Use operationId — kept for compatibility during PR 3.0 migration. */
	operation?: HumanResourcesCommandId;
	causationId?: string;
	idempotencyKey?: string;
};

/** Execution boundary metadata required for audit/outbox emission. */
export type HumanResourcesMutationExecutionMeta = HumanResourcesMutationMeta & {
	organizationId: string;
	actorUserId: string;
	requestedAt: string;
	idempotencyKey: string;
};

export function buildMutationMeta(input: {
	correlationId: string;
	operation?: HumanResourcesCommandId;
	operationId?: HumanResourcesCommandId;
	causationId?: string;
	idempotencyKey?: string;
}): HumanResourcesMutationMeta {
	if (
		input.operation !== undefined &&
		input.operationId !== undefined &&
		input.operation !== input.operationId
	) {
		throw new Error(
			"Human Resources mutation meta conflict: operation and operationId differ.",
		);
	}

	const operationId = input.operationId ?? input.operation;
	if (operationId === undefined) {
		throw new Error(
			"Human Resources mutation meta requires operationId or operation.",
		);
	}

	const meta: HumanResourcesMutationMeta = {
		correlationId: input.correlationId,
		operationId,
		operation: operationId,
	};

	if (input.causationId !== undefined) {
		meta.causationId = input.causationId;
	}
	if (input.idempotencyKey !== undefined) {
		meta.idempotencyKey = input.idempotencyKey;
	}

	return meta;
}

export function attachMutationExecutionContext(
	meta: HumanResourcesMutationMeta,
	context: {
		organizationId: string;
		actorUserId: string;
		requestedAt?: string;
		idempotencyKey?: string;
	},
): HumanResourcesMutationExecutionMeta {
	return {
		...meta,
		organizationId: context.organizationId,
		actorUserId: context.actorUserId,
		requestedAt: context.requestedAt ?? new Date().toISOString(),
		idempotencyKey:
			context.idempotencyKey ?? meta.idempotencyKey ?? meta.correlationId,
	};
}
