import type { Result } from "@afenda/errors";
import type { z } from "zod";
import type {
	PayrollCommandId,
	PayrollQueryId,
} from "../operations/module-ids";
import {
	runAuthorizedPayrollCommand,
	runAuthorizedPayrollQuery,
} from "./authorized-operation";
import {
	type PayrollCommandOptions,
	type PayrollQueryOptions,
	resolveCommandDeps,
	resolveQueryDeps,
} from "./command-options";
import type {
	MutationPorts,
	PayrollObservabilityPort,
	PayrollRunCalculatorPort,
	PayrollWorkforceInputPort,
} from "./ports";

interface ActorScoped {
	actorUserId: string;
	organizationId: string;
}

interface CommandDeps<TStore> {
	calculator: PayrollRunCalculatorPort | undefined;
	employees: PayrollWorkforceInputPort | undefined;
	observability: PayrollObservabilityPort | undefined;
	ports: MutationPorts;
	store: TStore;
}

interface QueryDeps<TStore> {
	employees: PayrollWorkforceInputPort | undefined;
	observability: PayrollObservabilityPort | undefined;
	store: TStore;
}

export function runPayrollCommand<
	TStore,
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: PayrollCommandOptions<TStore>,
	config: {
		command: PayrollCommandId;
		execute: (
			data: z.infer<TSchema>,
			deps: CommandDeps<TStore>,
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		schema: TSchema;
	},
): Promise<Result<TOut>> {
	return runAuthorizedPayrollCommand(input, options, {
		...config,
		resolve: (value) => {
			const {
				authorization,
				calculator,
				employees,
				observability,
				ports,
				store,
			} = resolveCommandDeps(value);
			return {
				authorization,
				observability,
				execution: {
					calculator,
					employees,
					observability,
					ports,
					store,
				},
			};
		},
	});
}

export function runPayrollQuery<
	TStore,
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: PayrollQueryOptions<TStore>,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: QueryDeps<TStore>,
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: PayrollQueryId;
		schema: TSchema;
	},
): Promise<Result<TOut>> {
	return runAuthorizedPayrollQuery(input, options, {
		...config,
		resolve: (value) => {
			const { authorization, employees, observability, store } =
				resolveQueryDeps(value);
			return {
				authorization,
				observability,
				execution: { employees, observability, store },
			};
		},
	});
}
