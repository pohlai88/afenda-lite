import type { HumanResourcesEventType } from "@afenda/events";
import type {
	HumanResourcesEmissionMode,
	HumanResourcesMutationEmissionDefinition,
} from "./emissions/types";
import type { HumanResourcesCommandId } from "./module-ids";

export {
	aggregateTypeToEntity,
	emitHumanResourcesMutationOutcome,
	type HumanResourcesMutationOutcome,
	type PlannedHumanResourcesMutationOutcome,
	planHumanResourcesMutationOutcome,
	validateHumanResourcesMutationOutcome,
} from "./emissions/mutation-outcome";
export { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "./emissions/registry";
export {
	getHumanResourcesMutationEmission,
	getRegistryDomainEventType,
	tryGetHumanResourcesMutationEmission,
} from "./emissions/resolve-emission";

export type {
	HumanResourcesEmissionMode,
	HumanResourcesMutationEmissionDefinition,
} from "./emissions/types";
export {
	type HumanResourcesEmissionRegistryIssue,
	validateHumanResourcesMutationEmissionRegistry,
} from "./emissions/validate-emission";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "./emissions/registry";
import { getHumanResourcesMutationEmission } from "./emissions/resolve-emission";

export type MutationEmissionKind = HumanResourcesEmissionMode;

export type MutationEmissionEntry = {
	command: HumanResourcesCommandId;
	emission: MutationEmissionKind;
	eventTypes?: readonly HumanResourcesEventType[];
};

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
	try {
		return toMutationEmissionEntry(getHumanResourcesMutationEmission(command));
	} catch {
		return undefined;
	}
}
