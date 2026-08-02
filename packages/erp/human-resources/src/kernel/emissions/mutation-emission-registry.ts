import type { HumanResourcesEventType } from "@afenda/events";
import type { HumanResourcesCommandId } from "../operations/module-ids";
import type {
	HumanResourcesEmissionMode,
	HumanResourcesMutationEmissionDefinition,
} from "./types";

export {
	aggregateTypeToEntity,
	emitHumanResourcesMutationOutcome,
	type HumanResourcesMutationOutcome,
	type PlannedHumanResourcesMutationOutcome,
	planHumanResourcesMutationOutcome,
	validateHumanResourcesMutationOutcome,
} from "./mutation-outcome";
export { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "./registry";
export {
	getHumanResourcesMutationEmission,
	getRegistryDomainEventType,
	tryGetHumanResourcesMutationEmission,
} from "./resolve-emission";

export type {
	HumanResourcesEmissionMode,
	HumanResourcesMutationEmissionDefinition,
} from "./types";
export {
	type HumanResourcesEmissionRegistryIssue,
	validateHumanResourcesMutationEmissionRegistry,
} from "./validate-emission";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "./registry";
import { tryGetHumanResourcesMutationEmission } from "./resolve-emission";

export type MutationEmissionKind = HumanResourcesEmissionMode;

export interface MutationEmissionEntry {
	command: HumanResourcesCommandId;
	emission: MutationEmissionKind;
	eventTypes?: readonly HumanResourcesEventType[];
}

function toMutationEmissionEntry(
	definition: HumanResourcesMutationEmissionDefinition,
): MutationEmissionEntry {
	if (definition.emissionMode === "audit_only") {
		return {
			command: definition.commandId,
			emission: "audit_only",
		};
	}
	return {
		command: definition.commandId,
		emission: "domain_event",
		eventTypes: definition.eventTypes,
	};
}

/** Stable ordered view derived from the canonical record registry. */
export const HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY = Object.freeze(
	Object.values(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).map(
		toMutationEmissionEntry,
	),
) satisfies readonly MutationEmissionEntry[];

export type RegisteredMutationCommand =
	(typeof HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY)[number]["command"];

export function getMutationEmissionEntry(
	command: HumanResourcesCommandId,
): MutationEmissionEntry | undefined {
	const definition = tryGetHumanResourcesMutationEmission(command);
	if (definition === undefined) {
		return;
	}
	return toMutationEmissionEntry(definition);
}
