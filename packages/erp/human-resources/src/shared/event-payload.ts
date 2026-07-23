import type { HumanResourcesMutationMeta } from "./mutation-meta";

export type HumanResourcesEntityEventPayload = {
	organizationId: string;
	entityType: string;
	entityId: string;
	actorId: string;
	correlationId: string;
	operation: string;
	causationId?: string;
	idempotencyKey?: string;
};

export function buildHumanResourcesEntityEventPayload(input: {
	organizationId: string;
	entityType: string;
	entityId: string;
	actorUserId: string;
	meta: HumanResourcesMutationMeta;
}): HumanResourcesEntityEventPayload {
	const payload: HumanResourcesEntityEventPayload = {
		organizationId: input.organizationId,
		entityType: input.entityType,
		entityId: input.entityId,
		actorId: input.actorUserId,
		correlationId: input.meta.correlationId,
		operation: input.meta.operation,
	};
	if (input.meta.causationId !== undefined) {
		payload.causationId = input.meta.causationId;
	}
	if (input.meta.idempotencyKey !== undefined) {
		payload.idempotencyKey = input.meta.idempotencyKey;
	}
	return payload;
}

export function humanResourcesEntityEventPayloadJson(input: {
	organizationId: string;
	entityType: string;
	entityId: string;
	actorUserId: string;
	meta: HumanResourcesMutationMeta;
}): string {
	return JSON.stringify(buildHumanResourcesEntityEventPayload(input));
}
