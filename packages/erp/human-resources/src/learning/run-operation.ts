import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import type { MutationPorts } from "../ports";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../shared/domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import type {
	HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
	HUMAN_RESOURCES_LEARNING_QUERY_IDS,
} from "./operation-registry";
import type { HumanResourcesLearningCapabilityStore } from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type LearningStoreMethod = keyof HumanResourcesLearningCapabilityStore;
type LearningStoreProjection<TMethods extends readonly LearningStoreMethod[]> =
	Pick<HumanResourcesLearningCapabilityStore, TMethods[number]>;

function projectLearningStore<
	const TMethods extends readonly LearningStoreMethod[],
>(
	store: HumanResourcesLearningCapabilityStore,
	_methods: TMethods,
): LearningStoreProjection<TMethods> {
	return store;
}

export async function runLearningCapabilityCommand<
	const TMethods extends readonly LearningStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: (typeof HUMAN_RESOURCES_LEARNING_COMMAND_IDS)[number];
		execute: (
			data: z.infer<TSchema>,
			deps: {
				ports: MutationPorts;
				store: LearningStoreProjection<TMethods>;
			},
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		...config,
		parityResourceKind: "employee",
		resolveDeps: (resolvedOptions) => {
			const { store, ports } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectLearningStore(store, config.storeMethods),
				ports,
			});
		},
	});
}

export async function runLearningCapabilityQuery<
	const TMethods extends readonly LearningStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: { store: LearningStoreProjection<TMethods> },
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: (typeof HUMAN_RESOURCES_LEARNING_QUERY_IDS)[number];
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		...config,
		parityResourceKind: "employee",
		resolveDeps: (resolvedOptions) => {
			const { store } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectLearningStore(store, config.storeMethods),
			});
		},
	});
}
