import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import type { HumanResourcesAuthorizedActorInput } from "../../kernel/authorization/run-authorized-operation";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../../kernel/execution/command-options";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../../kernel/execution/domain-runner";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	HUMAN_RESOURCES_STATUTORY_PROFILE_COMMAND_IDS,
	HUMAN_RESOURCES_STATUTORY_PROFILE_QUERY_IDS,
} from "./operation-registry";
import type { HumanResourcesStatutoryProfileCapabilityStore } from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type StatutoryStoreMethod = keyof HumanResourcesStatutoryProfileCapabilityStore;
type StatutoryStoreProjection<
	TMethods extends readonly StatutoryStoreMethod[],
> = Pick<HumanResourcesStatutoryProfileCapabilityStore, TMethods[number]>;

function projectStatutoryStore<
	const TMethods extends readonly StatutoryStoreMethod[],
>(
	store: HumanResourcesStatutoryProfileCapabilityStore,
	_methods: TMethods,
): StatutoryStoreProjection<TMethods> {
	return store;
}

export async function runStatutoryProfileCapabilityCommand<
	const TMethods extends readonly StatutoryStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: (typeof HUMAN_RESOURCES_STATUTORY_PROFILE_COMMAND_IDS)[number];
		execute: (
			data: z.infer<TSchema>,
			deps: {
				ports: MutationPorts;
				store: StatutoryStoreProjection<TMethods>;
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
				store: projectStatutoryStore(store, config.storeMethods),
				ports,
			});
		},
	});
}

export async function runStatutoryProfileCapabilityQuery<
	const TMethods extends readonly StatutoryStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: {
				options: HumanResourcesCommandOptions;
				store: StatutoryStoreProjection<TMethods>;
			},
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: (typeof HUMAN_RESOURCES_STATUTORY_PROFILE_QUERY_IDS)[number];
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
				options: resolvedOptions,
				store: projectStatutoryStore(store, config.storeMethods),
			});
		},
	});
}
