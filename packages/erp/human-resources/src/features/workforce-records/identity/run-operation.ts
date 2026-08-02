import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import type { HumanResourcesAuthorizedActorInput } from "../../../kernel/authorization/run-authorized-operation";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../../../kernel/execution/command-options";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../../../kernel/execution/domain-runner";
import type { MutationPorts } from "../../../kernel/execution/ports";
import type {
	HumanResourcesWorkforceFoundationCommandId,
	HumanResourcesWorkforceFoundationQueryId,
} from "../../../kernel/operations/module-ids";
import type { HumanResourcesWorkforceFoundationOperationStore } from "./store-contract";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type WorkforceFoundationStoreMethod =
	keyof HumanResourcesWorkforceFoundationOperationStore;
type WorkforceFoundationStoreProjection<
	TMethods extends readonly WorkforceFoundationStoreMethod[],
> = Pick<HumanResourcesWorkforceFoundationOperationStore, TMethods[number]>;

interface CommandDeps<
	TMethods extends readonly WorkforceFoundationStoreMethod[],
> {
	ports: MutationPorts;
	store: WorkforceFoundationStoreProjection<TMethods>;
}

interface QueryDeps<
	TMethods extends readonly WorkforceFoundationStoreMethod[],
> {
	store: WorkforceFoundationStoreProjection<TMethods>;
}

function projectWorkforceFoundationStore<
	const TMethods extends readonly WorkforceFoundationStoreMethod[],
>(
	store: HumanResourcesWorkforceFoundationOperationStore,
	_methods: TMethods,
): WorkforceFoundationStoreProjection<TMethods> {
	return store;
}

export async function runWorkforceFoundationCommand<
	const TMethods extends readonly WorkforceFoundationStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: HumanResourcesWorkforceFoundationCommandId;
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
				store: projectWorkforceFoundationStore(store, config.storeMethods),
				ports,
			});
		},
		execute: config.execute,
	});
}

export async function runWorkforceFoundationQuery<
	const TMethods extends readonly WorkforceFoundationStoreMethod[],
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
		query: HumanResourcesWorkforceFoundationQueryId;
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
				store: projectWorkforceFoundationStore(store, config.storeMethods),
			});
		},
		execute: config.execute,
	});
}
