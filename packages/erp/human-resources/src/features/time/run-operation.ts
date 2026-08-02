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
import type { HumanResourcesTimeCapabilityStore } from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type TimeCapabilityStoreMethod = keyof HumanResourcesTimeCapabilityStore;
type TimeCapabilityStoreProjection<
	TMethods extends readonly TimeCapabilityStoreMethod[],
> = Pick<HumanResourcesTimeCapabilityStore, TMethods[number]>;

function projectTimeCapabilityStore<
	const TMethods extends readonly TimeCapabilityStoreMethod[],
>(
	store: HumanResourcesTimeCapabilityStore,
	_methods: TMethods,
): TimeCapabilityStoreProjection<TMethods> {
	return store;
}

export async function runTimeCapabilityCommand<
	const TMethods extends readonly TimeCapabilityStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: typeof import("./operation-registry").HUMAN_RESOURCES_TIME_CAPABILITY_COMMAND_IDS[number];
		execute: (
			data: z.infer<TSchema>,
			deps: {
				ports: MutationPorts;
				store: TimeCapabilityStoreProjection<TMethods>;
			},
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		...config,
		parityResourceKind: "timesheet",
		resolveDeps: (resolvedOptions) => {
			const { store, ports } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectTimeCapabilityStore(store, config.storeMethods),
				ports,
			});
		},
	});
}

export async function runTimeCapabilityQuery<
	const TMethods extends readonly TimeCapabilityStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: { store: TimeCapabilityStoreProjection<TMethods> },
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: typeof import("./operation-registry").HUMAN_RESOURCES_TIME_CAPABILITY_QUERY_IDS[number];
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		...config,
		parityResourceKind: "timesheet",
		resolveDeps: (resolvedOptions) => {
			const { store } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectTimeCapabilityStore(store, config.storeMethods),
			});
		},
	});
}
