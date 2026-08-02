import type { HumanResourcesCommandId } from "../operations/module-ids";

/**
 * Request-scoped mutation side-effect metadata.
 *
 * `correlationId` is the caller-supplied trace id (never a command constant).
 * `operationId` is the canonical command identity.
 */
export interface HumanResourcesMutationMeta {
	causationId?: string | undefined;
	correlationId: string;
	idempotencyKey?: string | undefined;
	operationId: HumanResourcesCommandId;
}

/** Execution boundary metadata required for audit/outbox emission. */
export type HumanResourcesMutationExecutionMeta = HumanResourcesMutationMeta & {
	organizationId: string;
	actorUserId: string;
	requestedAt: string;
	idempotencyKey: string;
};

export function buildMutationMeta(input: {
	correlationId: string;
	operationId: HumanResourcesCommandId;
	causationId?: string | undefined;
	idempotencyKey?: string | undefined;
}): HumanResourcesMutationMeta {
	const meta: HumanResourcesMutationMeta = {
		correlationId: input.correlationId,
		operationId: input.operationId,
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
		requestedAt?: string | undefined;
		idempotencyKey?: string | undefined;
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
