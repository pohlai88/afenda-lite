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
import type { HumanResourcesRecruitmentCapabilityStore } from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type RecruitmentStoreMethod = keyof HumanResourcesRecruitmentCapabilityStore;
type RecruitmentStoreProjection<
	TMethods extends readonly RecruitmentStoreMethod[],
> = Pick<HumanResourcesRecruitmentCapabilityStore, TMethods[number]>;

function projectRecruitmentStore<
	const TMethods extends readonly RecruitmentStoreMethod[],
>(
	store: HumanResourcesRecruitmentCapabilityStore,
	_methods: TMethods,
): RecruitmentStoreProjection<TMethods> {
	return store;
}

export async function runRecruitmentCapabilityCommand<
	const TMethods extends readonly RecruitmentStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: typeof import("./operation-registry").HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS[number];
		execute: (
			data: z.infer<TSchema>,
			deps: {
				ports: MutationPorts;
				store: RecruitmentStoreProjection<TMethods>;
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
				store: projectRecruitmentStore(store, config.storeMethods),
				ports,
			});
		},
	});
}

export async function runRecruitmentCapabilityQuery<
	const TMethods extends readonly RecruitmentStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: { store: RecruitmentStoreProjection<TMethods> },
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: typeof import("./operation-registry").HUMAN_RESOURCES_RECRUITMENT_QUERY_IDS[number];
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		...config,
		parityResourceKind: "candidate",
		resolveDeps: (resolvedOptions) => {
			const { store } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectRecruitmentStore(store, config.storeMethods),
			});
		},
	});
}
