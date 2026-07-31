import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import type { MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "./domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "./run-authorized-operation";

type ActorScoped = HumanResourcesAuthorizedActorInput;

interface CommandDeps {
	ports: MutationPorts;
	store: HumanResourcesStore;
}

interface QueryDeps {
	store: HumanResourcesStore;
}

export async function runTimeCommand<TSchema extends z.ZodType, TOut>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema & z.ZodType<ActorScoped>;
		invalidMessage: string;
		command: HumanResourcesCommandId;
		execute: (
			data: z.output<TSchema>,
			deps: CommandDeps,
		) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		parityResourceKind: "timesheet",
		resolveDeps: (opts) => {
			const { store, ports } = resolveCommandDeps(opts);
			return errorResult.ok({ store, ports });
		},
		execute: config.execute,
	});
}

export async function runTimeQuery<TSchema extends z.ZodType, TOut>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema & z.ZodType<ActorScoped>;
		invalidMessage: string;
		query: HumanResourcesQueryId;
		execute: (
			data: z.output<TSchema>,
			deps: QueryDeps,
		) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		parityResourceKind: "timesheet",
		resolveDeps: (opts) => {
			const { store } = resolveCommandDeps(opts);
			return errorResult.ok({ store });
		},
		execute: config.execute,
	});
}
