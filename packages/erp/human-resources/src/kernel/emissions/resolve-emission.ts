import type { HumanResourcesEventType } from "@afenda/events";

import type { HumanResourcesCommandId } from "../operations/module-ids";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "./registry";
import type { HumanResourcesMutationEmissionDefinition } from "./types";

export function getHumanResourcesMutationEmission(
	commandId: HumanResourcesCommandId,
): HumanResourcesMutationEmissionDefinition {
	const definition =
		HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD[commandId];

	if (!definition) {
		throw new Error(`HR mutation command is not classified: ${commandId}`);
	}

	return definition;
}

export function tryGetHumanResourcesMutationEmission(
	commandId: HumanResourcesCommandId,
): HumanResourcesMutationEmissionDefinition | undefined {
	return HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD[commandId];
}

/** Primary declared domain event type for a classified domain_event command. */
export function getRegistryDomainEventType(
	commandId: HumanResourcesCommandId,
): HumanResourcesEventType {
	const definition = getHumanResourcesMutationEmission(commandId);
	if (definition.emissionMode !== "domain_event") {
		throw new Error(
			`HR mutation ${commandId} is not classified as domain_event.`,
		);
	}
	const [eventType] = definition.eventTypes;
	if (eventType === undefined) {
		throw new Error(`HR mutation ${commandId} has no declared event types.`);
	}
	return eventType;
}
