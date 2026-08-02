import { createHash } from "node:crypto";
import type { Result } from "@afenda/errors";
import type { z } from "zod";
import type {
	PayrollCommandId,
	PayrollQueryId,
} from "../operations/module-ids";
import { parsePayrollInput } from "../validation/parse-input";
import {
	type PayrollAuthorizationPort,
	requirePayrollCommandPermission,
	requirePayrollQueryPermission,
} from "./authorization";
import type { PayrollObservabilityPort } from "./ports";

interface ActorScoped {
	actorUserId: string;
	organizationId: string;
}

interface ResolvedOperationDeps<TDeps> {
	authorization: PayrollAuthorizationPort | undefined;
	execution: TDeps;
	observability: PayrollObservabilityPort | undefined;
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

export async function runAuthorizedPayrollCommand<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
	TOptions,
	TDeps,
>(
	input: unknown,
	options: TOptions,
	config: {
		command: PayrollCommandId;
		execute: (data: z.infer<TSchema>, deps: TDeps) => Promise<Result<TOut>>;
		invalidMessage: string;
		resolve: (options: TOptions) => ResolvedOperationDeps<TDeps>;
		schema: TSchema;
	},
): Promise<Result<TOut>> {
	const parsed = parsePayrollInput(config.schema, input, config.invalidMessage);
	if (!parsed.ok) {
		return parsed;
	}

	const startedAt = Date.now();
	const deps = config.resolve(options);
	const authorized = await requirePayrollCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: config.command,
	});
	if (!authorized.ok) {
		await observe(
			deps.observability,
			{ ...parsed.data, operation: config.command, startedAt },
			authorized,
		);
		return authorized;
	}

	const result = await config.execute(parsed.data, deps.execution);
	await observe(
		deps.observability,
		{ ...parsed.data, operation: config.command, startedAt },
		result,
	);
	return result;
}

export async function runAuthorizedPayrollQuery<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
	TOptions,
	TDeps,
>(
	input: unknown,
	options: TOptions,
	config: {
		execute: (data: z.infer<TSchema>, deps: TDeps) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: PayrollQueryId;
		resolve: (options: TOptions) => ResolvedOperationDeps<TDeps>;
		schema: TSchema;
	},
): Promise<Result<TOut>> {
	const parsed = parsePayrollInput(config.schema, input, config.invalidMessage);
	if (!parsed.ok) {
		return parsed;
	}

	const startedAt = Date.now();
	const deps = config.resolve(options);
	const authorized = await requirePayrollQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: config.query,
	});
	if (!authorized.ok) {
		await observe(
			deps.observability,
			{ ...parsed.data, operation: config.query, startedAt },
			authorized,
		);
		return authorized;
	}

	const result = await config.execute(parsed.data, deps.execution);
	await observe(
		deps.observability,
		{ ...parsed.data, operation: config.query, startedAt },
		result,
	);
	return result;
}
