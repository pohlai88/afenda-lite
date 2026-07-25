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

import {
	type MutationEmissionEntry,
	type MutationEmissionKind,
	toLegacyMutationEmissionEntry,
} from "./emissions/legacy-compat";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "./emissions/registry";
import { getHumanResourcesMutationEmission } from "./emissions/resolve-emission";

export type { MutationEmissionEntry, MutationEmissionKind };

/**
 * Legacy array view derived from the canonical record registry.
 */
export const HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY = Object.freeze(
	Object.values(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).map(
		toLegacyMutationEmissionEntry,
	),
) satisfies readonly MutationEmissionEntry[];

export type RegisteredMutationCommand =
	(typeof HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY)[number]["command"];

export function getMutationEmissionEntry(
	command: HumanResourcesCommandId,
): MutationEmissionEntry | undefined {
	try {
		return toLegacyMutationEmissionEntry(
			getHumanResourcesMutationEmission(command),
		);
	} catch {
		return undefined;
	}
}
