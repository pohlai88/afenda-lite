import type { Result } from "@afenda/errors";
import type { z } from "zod";
import {
	runAuthorizedPayrollCommand,
	runAuthorizedPayrollQuery,
} from "../../kernel/execution/authorized-operation";
import {
	type PayrollCommandOptions,
	type PayrollQueryOptions,
	requirePayrollMutationPorts,
	requirePayrollStore,
} from "../../kernel/execution/command-options";
import type {
	MutationPorts,
	PayrollObservabilityPort,
} from "../../kernel/execution/ports";
import type {
	PayrollCommandId,
	PayrollQueryId,
} from "../../kernel/operations/module-ids";
import type { PayrollSetupStore } from "./setup.store";

export type PayrollSetupCommandOptions =
	PayrollCommandOptions<PayrollSetupStore>;
export type PayrollSetupQueryOptions = PayrollQueryOptions<PayrollSetupStore>;

interface ActorScoped {
	actorUserId: string;
	organizationId: string;
}

interface CommandDeps {
	observability: PayrollObservabilityPort | undefined;
	ports: MutationPorts;
	store: PayrollSetupStore;
}

interface QueryDeps {
	observability: PayrollObservabilityPort | undefined;
	store: PayrollSetupStore;
}

export function runPayrollSetupCommand<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: PayrollSetupCommandOptions,
	config: {
		command: PayrollCommandId;
		execute: (
			data: z.infer<TSchema>,
			deps: CommandDeps,
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		schema: TSchema;
	},
): Promise<Result<TOut>> {
	return runAuthorizedPayrollCommand(input, options, {
		...config,
		resolve: (value) => {
			const { authorization, observability } = value;
			const ports = requirePayrollMutationPorts(value.ports);
			const store = requirePayrollStore(value.store);
			return {
				authorization,
				observability,
				execution: { observability, ports, store },
			};
		},
	});
}

export function runPayrollSetupQuery<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: PayrollSetupQueryOptions,
	config: {
		execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: PayrollQueryId;
		schema: TSchema;
	},
): Promise<Result<TOut>> {
	return runAuthorizedPayrollQuery(input, options, {
		...config,
		resolve: (value) => {
			const { authorization, observability } = value;
			const store = requirePayrollStore(value.store);
			return {
				authorization,
				observability,
				execution: { observability, store },
			};
		},
	});
}
