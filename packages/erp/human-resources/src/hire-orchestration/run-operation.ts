import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import type { MutationPorts } from "../ports";
import { runParsedAuthorizedCommand } from "../shared/domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import type { HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS } from "./operation-registry";
import type { HumanResourcesHireOrchestrationCapabilityStore } from "./store";

type HireStoreMethod = keyof HumanResourcesHireOrchestrationCapabilityStore;
type HireStoreProjection<TMethods extends readonly HireStoreMethod[]> = Pick<
	HumanResourcesHireOrchestrationCapabilityStore,
	TMethods[number]
>;

function projectHireStore<const TMethods extends readonly HireStoreMethod[]>(
	store: HumanResourcesHireOrchestrationCapabilityStore,
	_methods: TMethods,
): HireStoreProjection<TMethods> {
	return store;
}

export async function runHireOrchestrationCapabilityCommand<
	const TMethods extends readonly HireStoreMethod[],
	TSchema extends z.ZodType<HumanResourcesAuthorizedActorInput>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: (typeof HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS)[number];
		execute: (
			data: z.infer<TSchema>,
			deps: {
				ports: MutationPorts;
				store: HireStoreProjection<TMethods>;
			},
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		...config,
		parityResourceKind: "candidate",
		resolveDeps: (resolvedOptions) => {
			const { store, ports } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectHireStore(store, config.storeMethods),
				ports,
			});
		},
	});
}
