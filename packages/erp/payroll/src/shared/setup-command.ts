import { createHash } from "node:crypto";
import type { Result } from "@afenda/errors";
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
import type {
	MutationPorts,
	PayrollEmployeeQueryPort,
	PayrollObservabilityPort,
	PayrollRunCalculatorPort,
} from "../ports";
import type { PayrollStore } from "../store";

interface ActorScoped {
	actorUserId: string;
	organizationId: string;
}

interface CommandDeps {
	calculator: PayrollRunCalculatorPort | undefined;
	employees: PayrollEmployeeQueryPort | undefined;
	observability: PayrollObservabilityPort | undefined;
	ports: MutationPorts;
	store: PayrollStore;
}

interface QueryDeps {
	employees: PayrollEmployeeQueryPort | undefined;
	observability: PayrollObservabilityPort | undefined;
	store: PayrollStore;
}

function token(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

async function observe(
	port: PayrollObservabilityPort | undefined,
	input: ActorScoped & { operation: string; startedAt: number },
	result: Result<unknown>,
): Promise<void> {
	if (port === undefined) {
		return;
	}
	try {
		await port.record({
			operation: input.operation,
			outcome: result.ok ? "ok" : "failure",
			...(result.ok ? {} : { errorCode: result.code }),
			durationMs: Math.max(0, Date.now() - input.startedAt),
			organizationToken: token(input.organizationId),
			actorToken: token(input.actorUserId),
		});
	} catch {
		// Telemetry is deliberately best-effort and cannot change payroll outcomes.
	}
}

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
	const parsed = parsePayrollInput(config.schema, input, config.invalidMessage);
	if (!parsed.ok) {
		return parsed;
	}

	const startedAt = Date.now();
	const { store, ports, authorization, employees, calculator, observability } =
		resolveCommandDeps(options);
	const authorized = await requirePayrollCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: config.command,
	});
	if (!authorized.ok) {
		await observe(
			observability,
			{ ...parsed.data, operation: config.command, startedAt },
			authorized,
		);
		return authorized;
	}

	const result = await config.execute(parsed.data, {
		store,
		ports,
		employees,
		calculator,
		observability,
	});
	await observe(
		observability,
		{ ...parsed.data, operation: config.command, startedAt },
		result,
	);
	return result;
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
	const parsed = parsePayrollInput(config.schema, input, config.invalidMessage);
	if (!parsed.ok) {
		return parsed;
	}

	const startedAt = Date.now();
	const { store, authorization, employees, observability } =
		resolveCommandDeps(options);
	const authorized = await requirePayrollQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: config.query,
	});
	if (!authorized.ok) {
		await observe(
			observability,
			{ ...parsed.data, operation: config.query, startedAt },
			authorized,
		);
		return authorized;
	}

	const result = await config.execute(parsed.data, {
		store,
		employees,
		observability,
	});
	await observe(
		observability,
		{ ...parsed.data, operation: config.query, startedAt },
		result,
	);
	return result;
}
