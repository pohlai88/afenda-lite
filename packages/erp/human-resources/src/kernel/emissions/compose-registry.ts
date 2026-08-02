import type { HumanResourcesCommandId } from "../operations/module-ids";

import type {
	HumanResourcesEmissionRegistry,
	HumanResourcesMutationEmissionDefinition,
} from "./types";

export function composeHumanResourcesEmissionRegistry(
	...registries: readonly HumanResourcesEmissionRegistry[]
): HumanResourcesEmissionRegistry {
	const composed: HumanResourcesEmissionRegistry = {};

	for (const registry of registries) {
		for (const [rawCommandId, definition] of Object.entries(registry)) {
			const commandId = rawCommandId as HumanResourcesCommandId;
			if (composed[commandId]) {
				throw new Error(`Duplicate HR emission classification: ${commandId}`);
			}
			composed[commandId] =
				definition as HumanResourcesMutationEmissionDefinition;
		}
	}

	return Object.freeze(composed);
}
