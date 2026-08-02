import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../emissions/registry";
import type {
	HumanResourcesEmissionRegistry,
	HumanResourcesMutationEmissionDefinition,
} from "../emissions/types";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "./registry";
import type { HumanResourcesOperationDefinition } from "./types";

const QUERY_EMISSION_DISPOSITION = Object.freeze({
	emissionMode: "not_applicable",
} as const);

const COMMAND_EXECUTION_DISPOSITION = Object.freeze({
	audit: "required",
	emission: "required",
	idempotency: "required",
	transaction: "required",
} as const);

const QUERY_EXECUTION_DISPOSITION = Object.freeze({
	audit: "none",
	emission: "none",
	idempotency: "none",
	transaction: "none",
} as const);

export type HumanResourcesGovernedCommandDefinition =
	HumanResourcesOperationDefinition & {
		readonly kind: "command";
		readonly emission: HumanResourcesMutationEmissionDefinition;
		readonly execution: typeof COMMAND_EXECUTION_DISPOSITION;
	};

export type HumanResourcesGovernedQueryDefinition =
	HumanResourcesOperationDefinition & {
		readonly kind: "query";
		readonly emission: typeof QUERY_EMISSION_DISPOSITION;
		readonly execution: typeof QUERY_EXECUTION_DISPOSITION;
	};

export type HumanResourcesGovernedOperationDefinition =
	| HumanResourcesGovernedCommandDefinition
	| HumanResourcesGovernedQueryDefinition;

function findEmissionDefinition(
	emissions: HumanResourcesEmissionRegistry,
	operationId: string,
): HumanResourcesMutationEmissionDefinition | undefined {
	return Object.entries(emissions).find(
		([commandId]) => commandId === operationId,
	)?.[1];
}

export function composeHumanResourcesOperationGovernanceManifest(
	definitions: readonly HumanResourcesOperationDefinition[],
	emissions: HumanResourcesEmissionRegistry,
): Readonly<
	Record<
		HumanResourcesOperationDefinition["id"],
		HumanResourcesGovernedOperationDefinition
	>
> {
	const manifestEntries: [
		HumanResourcesOperationDefinition["id"],
		HumanResourcesGovernedOperationDefinition,
	][] = [];
	const operationIds = new Set<string>();

	for (const definition of definitions) {
		if (operationIds.has(definition.id)) {
			throw new Error(
				`Duplicate HR governed operation definition: ${definition.id}`,
			);
		}
		operationIds.add(definition.id);

		if (definition.kind === "query") {
			manifestEntries.push([
				definition.id,
				Object.freeze({
					...definition,
					kind: "query",
					emission: QUERY_EMISSION_DISPOSITION,
					execution: QUERY_EXECUTION_DISPOSITION,
				}),
			]);
			continue;
		}

		const emission = findEmissionDefinition(emissions, definition.id);
		if (emission === undefined) {
			throw new Error(
				`HR command has no canonical emission definition: ${definition.id}`,
			);
		}
		manifestEntries.push([
			definition.id,
			Object.freeze({
				...definition,
				kind: "command",
				emission,
				execution: COMMAND_EXECUTION_DISPOSITION,
			}),
		]);
	}

	for (const commandId of Object.keys(emissions)) {
		if (!operationIds.has(commandId)) {
			throw new Error(
				`HR emission references an unknown operation: ${commandId}`,
			);
		}
	}

	return Object.freeze(Object.fromEntries(manifestEntries));
}

export const HUMAN_RESOURCES_OPERATION_GOVERNANCE_MANIFEST =
	composeHumanResourcesOperationGovernanceManifest(
		HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS,
		HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
	);
