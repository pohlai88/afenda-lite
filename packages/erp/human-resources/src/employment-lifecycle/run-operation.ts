import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import type {
	HumanResourcesEmploymentLifecycleCommandId,
	HumanResourcesEmploymentLifecycleQueryId,
} from "../module-ids";
import type { MutationPorts } from "../ports";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../shared/domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import type { HumanResourcesEmploymentLifecycleStore } from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type EmploymentStoreMethod = keyof HumanResourcesEmploymentLifecycleStore;
type EmploymentStoreProjection<
	TMethods extends readonly EmploymentStoreMethod[],
> = Pick<HumanResourcesEmploymentLifecycleStore, TMethods[number]>;

interface CommandDeps<TMethods extends readonly EmploymentStoreMethod[]> {
	ports: MutationPorts;
	store: EmploymentStoreProjection<TMethods>;
}

interface QueryDeps<TMethods extends readonly EmploymentStoreMethod[]> {
	store: EmploymentStoreProjection<TMethods>;
}

function projectEmploymentStore<
	const TMethods extends readonly EmploymentStoreMethod[],
>(
	store: HumanResourcesEmploymentLifecycleStore,
	_methods: TMethods,
): EmploymentStoreProjection<TMethods> {
	return store;
}

export async function runEmploymentLifecycleCommand<
	const TMethods extends readonly EmploymentStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: HumanResourcesEmploymentLifecycleCommandId;
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
		parityResourceKind: "employee",
		resolveDeps: (resolvedOptions) => {
			const { store, ports } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectEmploymentStore(store, config.storeMethods),
				ports,
			});
		},
		execute: config.execute,
	});
}

export async function runEmploymentLifecycleQuery<
	const TMethods extends readonly EmploymentStoreMethod[],
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
		query: HumanResourcesEmploymentLifecycleQueryId;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		parityResourceKind: "employee",
		resolveDeps: (resolvedOptions) => {
			const { store } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectEmploymentStore(store, config.storeMethods),
			});
		},
		execute: config.execute,
	});
}
