import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import type {
	HumanResourcesOrganizationCommandId,
	HumanResourcesOrganizationQueryId,
} from "../module-ids";
import type { MutationPorts } from "../ports";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../shared/domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import type { HumanResourcesOrganizationStore } from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type OrganizationStoreMethod = keyof HumanResourcesOrganizationStore;
type OrganizationStoreProjection<
	TMethods extends readonly OrganizationStoreMethod[],
> = Pick<HumanResourcesOrganizationStore, TMethods[number]>;

interface CommandDeps<TMethods extends readonly OrganizationStoreMethod[]> {
	ports: MutationPorts;
	store: OrganizationStoreProjection<TMethods>;
}

interface QueryDeps<TMethods extends readonly OrganizationStoreMethod[]> {
	store: OrganizationStoreProjection<TMethods>;
}

function projectOrganizationStore<
	const TMethods extends readonly OrganizationStoreMethod[],
>(
	store: HumanResourcesOrganizationStore,
	_methods: TMethods,
): OrganizationStoreProjection<TMethods> {
	return store;
}

export async function runOrganizationCommand<
	const TMethods extends readonly OrganizationStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: HumanResourcesOrganizationCommandId;
		execute: (
			data: z.infer<TSchema>,
			deps: CommandDeps<TMethods>,
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		resolveDeps: (resolvedOptions) => {
			const { store, ports } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectOrganizationStore(store, config.storeMethods),
				ports,
			});
		},
		execute: config.execute,
	});
}

export async function runOrganizationQuery<
	const TMethods extends readonly OrganizationStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: QueryDeps<TMethods>,
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: HumanResourcesOrganizationQueryId;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		resolveDeps: (resolvedOptions) => {
			const { store } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectOrganizationStore(store, config.storeMethods),
			});
		},
		execute: config.execute,
	});
}
