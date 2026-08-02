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
	HumanResourcesEmploymentLifecycleCommandId,
	HumanResourcesEmploymentLifecycleQueryId,
} from "../../kernel/operations/module-ids";
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
