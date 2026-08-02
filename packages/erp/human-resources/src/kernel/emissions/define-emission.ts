import type { HumanResourcesEventType } from "@afenda/events";

import type { HumanResourcesCommandId } from "../operations/module-ids";

import type {
	HumanResourcesAuditOnlyEmission,
	HumanResourcesDomain,
	HumanResourcesDomainEventEmission,
} from "./types";

interface CommonDefinition {
	aggregateType: string;
	domain: HumanResourcesDomain;
}

export function defineAuditOnlyEmission(
	commandId: HumanResourcesCommandId,
	definition: CommonDefinition,
): HumanResourcesAuditOnlyEmission {
	return Object.freeze({
		commandId,
		emissionMode: "audit_only",
		eventTypes: [] as const,
		auditRequired: true,
		correlationRequired: true,
		idempotencyRequired: true,
		domain: definition.domain,
		aggregateType: definition.aggregateType,
	});
}

export function defineDomainEventEmission(
	commandId: HumanResourcesCommandId,
	definition: CommonDefinition & {
		eventTypes: readonly [
			HumanResourcesEventType,
			...HumanResourcesEventType[],
		];
	},
): HumanResourcesDomainEventEmission {
	return Object.freeze({
		commandId,
		emissionMode: "domain_event",
		eventTypes: definition.eventTypes,
		auditRequired: true,
		correlationRequired: true,
		idempotencyRequired: true,
		domain: definition.domain,
		aggregateType: definition.aggregateType,
	});
}
