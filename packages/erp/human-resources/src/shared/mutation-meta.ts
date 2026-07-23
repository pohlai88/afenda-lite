import type { HumanResourcesCommandId } from "../module-ids";

/**
 * Request-scoped mutation side-effect metadata.
 *
 * `correlationId` is the caller-supplied trace id (never a command constant).
 * `operation` carries the command id as a separate attribute for audit/outbox.
 */
export type HumanResourcesMutationMeta = {
	correlationId: string;
	operation: HumanResourcesCommandId;
	causationId?: string;
	idempotencyKey?: string;
};

export function buildMutationMeta(input: {
	correlationId: string;
	operation: HumanResourcesCommandId;
	causationId?: string;
	idempotencyKey?: string;
}): HumanResourcesMutationMeta {
	const meta: HumanResourcesMutationMeta = {
		correlationId: input.correlationId,
		operation: input.operation,
	};
	if (input.causationId !== undefined) {
		meta.causationId = input.causationId;
	}
	if (input.idempotencyKey !== undefined) {
		meta.idempotencyKey = input.idempotencyKey;
	}
	return meta;
}
