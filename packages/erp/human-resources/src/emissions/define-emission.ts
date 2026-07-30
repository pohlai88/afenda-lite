import type { HumanResourcesEventType } from "@afenda/events";

import type { HumanResourcesCommandId } from "../module-ids";

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
	return {
		commandId,
		emissionMode: "audit_only",
		eventTypes: [],
		auditRequired: true,
		correlationRequired: true,
		domain: definition.domain,
		aggregateType: definition.aggregateType,
	};
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
	return {
		commandId,
		emissionMode: "domain_event",
		eventTypes: definition.eventTypes,
		auditRequired: true,
		correlationRequired: true,
		domain: definition.domain,
		aggregateType: definition.aggregateType,
	};
}
