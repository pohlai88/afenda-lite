import type { HumanResourcesEventType } from "@afenda/events";

import type { HumanResourcesCommandId } from "../module-ids";
import type { OutboxFactInput, MutationPorts } from "../ports";
import { ok, type Result } from "@afenda/errors/result";
import {
	attachMutationExecutionContext,
	type HumanResourcesMutationMeta,
} from "../shared/mutation-meta";

import {
	aggregateTypeToEntity,
	type HumanResourcesMutationOutcome,
	type PlannedHumanResourcesMutationOutcome,
	planHumanResourcesMutationOutcome,
} from "./mutation-outcome";
import { getHumanResourcesMutationEmission, getRegistryDomainEventType, tryGetHumanResourcesMutationEmission } from "./resolve-emission";

/**
 * Drizzle CTE bridge: converts a planned mutation outcome into outbox event
 * parameters for embedded SQL transactions.
 */
export function plannedOutboxEventType(
	planned: PlannedHumanResourcesMutationOutcome,
): OutboxFactInput["type"] | undefined {
	return planned.outboxInput?.type;
}

export function plannedOutboxPayloadJson(
	planned: PlannedHumanResourcesMutationOutcome,
): string | undefined {
	if (!planned.outboxInput) return undefined;
	return JSON.stringify(planned.outboxInput.payload);
}

export function assertRegistryAllowsEvent(
	planned: PlannedHumanResourcesMutationOutcome,
	eventType: OutboxFactInput["type"],
): void {
	if (planned.definition.emissionMode !== "domain_event") {
		throw new Error(
			`Registry declares audit-only for ${planned.definition.commandId}; cannot emit ${eventType}.`,
		);
	}
	if (!planned.outboxInput) {
		throw new Error(
			`Planned outcome missing outbox for ${planned.definition.commandId}.`,
		);
	}
	if (planned.outboxInput.type !== eventType) {
		throw new Error(
			`Event type mismatch for ${planned.definition.commandId}: planned ${planned.outboxInput.type}, requested ${eventType}.`,
		);
	}
	if (!planned.definition.eventTypes.includes(eventType)) {
		throw new Error(
			`Undeclared event ${eventType} for ${planned.definition.commandId}.`,
		);
	}
}

export function planLeaveMutationOutboxEventType(input: {
	commandId: HumanResourcesCommandId;
	meta: HumanResourcesMutationMeta;
	organizationId: string;
	actorUserId: string;
	aggregateId: string;
	audit: HumanResourcesMutationOutcome["audit"];
	eventType?: HumanResourcesEventType;
	eventEntityId?: string;
	eventEntityType?: string;
	conditionalEventSuppressed?: boolean;
}): OutboxFactInput["type"] | undefined {
	return planCommandMutationOutboxEventType(input);
}

export function planRecruitmentMutationOutboxEventType(input: {
	commandId: HumanResourcesCommandId;
	meta: HumanResourcesMutationMeta;
	organizationId: string;
	actorUserId: string;
	aggregateId: string;
	audit: HumanResourcesMutationOutcome["audit"];
	eventType?: HumanResourcesEventType;
	eventEntityId?: string;
	eventEntityType?: string;
	conditionalEventSuppressed?: boolean;
}): OutboxFactInput["type"] | undefined {
	return planCommandMutationOutboxEventType(input);
}

export function planCommandMutationOutboxEventType(input: {
	commandId: HumanResourcesCommandId;
	meta: HumanResourcesMutationMeta;
	organizationId: string;
	actorUserId: string;
	aggregateId: string;
	audit: HumanResourcesMutationOutcome["audit"];
	eventType?: HumanResourcesEventType;
	eventEntityId?: string;
	eventEntityType?: string;
	conditionalEventSuppressed?: boolean;
}): OutboxFactInput["type"] | undefined {
	return plannedOutboxEventType(
		planCommandMutationOutcome(input),
	);
}

export function buildRegistryOutboxInput(input: {
	commandId: HumanResourcesCommandId;
	meta: HumanResourcesMutationMeta;
	organizationId: string;
	actorUserId: string;
	aggregateId: string;
	eventEntityId?: string;
	eventEntityType?: string;
	conditionalEventSuppressed?: boolean;
}): OutboxFactInput | undefined {
	const planned = planCommandMutationOutcome({
		...input,
		audit: {
			entity:
				input.eventEntityType ??
				aggregateTypeToEntity(
					tryGetHumanResourcesMutationEmission(input.commandId)
						?.aggregateType ?? input.commandId,
				),
			action: "UPDATE",
			changes: [],
		},
	});
	return planned.outboxInput;
}

export async function appendRegistryGatedOutbox(
	ports: MutationPorts,
	input: {
		commandId: HumanResourcesCommandId;
		meta: HumanResourcesMutationMeta;
		organizationId: string;
		actorUserId: string;
		aggregateId: string;
		eventEntityId?: string;
		eventEntityType?: string;
		conditionalEventSuppressed?: boolean;
	},
): Promise<Result<void>> {
	const outboxInput = buildRegistryOutboxInput(input);
	if (!outboxInput) {
		return ok(undefined);
	}
	const outbox = await ports.outbox.append(outboxInput);
	if (!outbox.ok) {
		return outbox;
	}
	return ok(undefined);
}

function planCommandMutationOutcome(input: {
	commandId: HumanResourcesCommandId;
	meta: HumanResourcesMutationMeta;
	organizationId: string;
	actorUserId: string;
	aggregateId: string;
	audit: HumanResourcesMutationOutcome["audit"];
	eventType?: HumanResourcesEventType;
	eventEntityId?: string;
	eventEntityType?: string;
	conditionalEventSuppressed?: boolean;
}): PlannedHumanResourcesMutationOutcome {
	const definition = getHumanResourcesMutationEmission(input.commandId);
	const executionMeta = attachMutationExecutionContext(input.meta, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
	});
	const eventEntityType =
		input.eventEntityType ??
		(input.eventType
			? aggregateTypeToEntity(definition.aggregateType)
			: undefined);
	const eventEntityId = input.eventEntityId ?? input.aggregateId;
	const resolvedEventType =
		input.eventType ??
		(definition.emissionMode === "domain_event" && !input.conditionalEventSuppressed
			? getRegistryDomainEventType(input.commandId)
			: undefined);

	return planHumanResourcesMutationOutcome({
		commandId: input.commandId,
		meta: executionMeta,
		aggregateType: definition.aggregateType,
		aggregateId: input.aggregateId,
		conditionalEventSuppressed: input.conditionalEventSuppressed,
		audit: input.audit,
		event: resolvedEventType
			? {
					type: resolvedEventType,
					entityId: eventEntityId,
					entityType: eventEntityType,
					payload: {
						organizationId: input.organizationId,
						entityType: eventEntityType ?? input.audit.entity,
						entityId: eventEntityId,
						actorId: input.actorUserId,
						correlationId: input.meta.correlationId,
						operation: input.meta.operationId,
					},
				}
			: undefined,
	});
}
