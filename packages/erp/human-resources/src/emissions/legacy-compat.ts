import type { HumanResourcesEventType } from "@afenda/events";

import type { HumanResourcesCommandId } from "../module-ids";

import type { HumanResourcesEmissionMode } from "./types";

/** Legacy array emission kind (compatibility with pre-3.0 tests). */
export type MutationEmissionKind = HumanResourcesEmissionMode;

export type MutationEmissionEntry = {
	command: HumanResourcesCommandId;
	emission: MutationEmissionKind;
	eventTypes?: readonly HumanResourcesEventType[];
};

export function toLegacyMutationEmissionEntry(
	definition: import("./types").HumanResourcesMutationEmissionDefinition,
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
