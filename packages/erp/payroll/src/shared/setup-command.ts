import type { Result } from "@afenda/errors/result";
import type { z } from "zod";

import {
	requirePayrollCommandPermission,
	requirePayrollQueryPermission,
} from "../authorization";
import {
	type PayrollCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import type { PayrollCommandId, PayrollQueryId } from "../module-ids";
import { parsePayrollInput } from "../parse-input";
import type { MutationPorts, PayrollEmployeeQueryPort, PayrollRunCalculatorPort } from "../ports";
import type { PayrollStore } from "../store";

type ActorScoped = {
	organizationId: string;
	actorUserId: string;
};

type CommandDeps = {
	store: PayrollStore;
	ports: MutationPorts;
	employees: PayrollEmployeeQueryPort | undefined;
	calculator: PayrollRunCalculatorPort | undefined;
};

type QueryDeps = {
	store: PayrollStore;
};

export async function runPayrollSetupCommand<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: PayrollCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		command: PayrollCommandId;
		execute: (
			data: z.infer<TSchema>,
			deps: CommandDeps,
		) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	const parsed = parsePayrollInput(
		config.schema,
		input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization, employees, calculator } =
		resolveCommandDeps(options);
	const authorized = await requirePayrollCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: config.command,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, { store, ports, employees, calculator });
}

export async function runPayrollSetupQuery<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: PayrollCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: PayrollQueryId;
		execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	const parsed = parsePayrollInput(
		config.schema,
		input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requirePayrollQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: config.query,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, { store });
}
