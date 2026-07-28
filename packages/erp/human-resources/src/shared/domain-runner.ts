import type { Result } from "@afenda/errors/result";
import type { z } from "zod";

import type { HumanResourcesCommandOptions } from "../command-options";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import { observeAuthorizedOperationResult } from "../observability/operation-observability";
import { parseHumanResourcesInput } from "../parse-input";
import type {
	HumanResourcesFieldProjection,
	HumanResourcesResourceContext,
	HumanResourcesResourceKind,
} from "./authorization-types";
import {
	type HumanResourcesAuthorizedActorInput,
	runDomainAuthorizedOperation,
} from "./run-authorized-operation";

type ActorScopedSchema = z.ZodType<HumanResourcesAuthorizedActorInput>;

type ResourceResolution =
	| HumanResourcesResourceContext
	| undefined
	| Result<HumanResourcesResourceContext | undefined>;

type ParsedAuthorizedConfig<
	TSchema extends ActorScopedSchema,
	TDeps,
	TOut,
	TProjected = TOut,
> = {
	schema: TSchema;
	invalidMessage: string;
	parityResourceKind?: HumanResourcesResourceKind;
	resolveResource?: (
		input: z.infer<TSchema>,
		options: HumanResourcesCommandOptions,
		deps: TDeps,
	) => ResourceResolution | Promise<ResourceResolution>;
	project?: (
		value: TOut,
		projection: HumanResourcesFieldProjection | undefined,
	) => TProjected;
	resolveRequestedFields?: (
		input: z.infer<TSchema>,
	) => readonly string[] | undefined;
	/**
	 * Optional options override after parse (e.g. leave custom authorize proof).
	 */
	resolveOptions?: (
		options: HumanResourcesCommandOptions,
		data: z.infer<TSchema>,
	) => Promise<Result<HumanResourcesCommandOptions>>;
	resolveDeps: (
		options: HumanResourcesCommandOptions,
		data: z.infer<TSchema>,
	) => Result<TDeps> | Promise<Result<TDeps>>;
	execute: (data: z.infer<TSchema>, deps: TDeps) => Promise<Result<TOut>>;
};

async function runParsedAuthorizedOperation<
	TSchema extends ActorScopedSchema,
	TDeps,
	TOut,
	TProjected = TOut,
>(params: {
	input: unknown;
	options: HumanResourcesCommandOptions;
	operationId: HumanResourcesCommandId | HumanResourcesQueryId;
	operationKind: "command" | "query";
	config: ParsedAuthorizedConfig<TSchema, TDeps, TOut, TProjected>;
}): Promise<Result<TProjected>> {
	const startedAtMs = Date.now();
	const { config } = params;
	const observeEarlyResult = <T>(
		result: Result<T>,
		options: HumanResourcesCommandOptions = params.options,
	) =>
		observeAuthorizedOperationResult({
			operationId: params.operationId,
			operationKind: params.operationKind,
			observability: options.observability,
			startedAtMs,
			result,
		});
	const parsed = parseHumanResourcesInput(
		config.schema,
		params.input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return observeEarlyResult(parsed);
	}

	let operationOptions = params.options;
	if (config.resolveOptions !== undefined) {
		const resolvedOptions = await config.resolveOptions(
			params.options,
			parsed.data,
		);
		if (!resolvedOptions.ok) {
			return observeEarlyResult(resolvedOptions);
		}
		operationOptions = resolvedOptions.data;
	}

	const depsResult = await config.resolveDeps(operationOptions, parsed.data);
	if (!depsResult.ok) {
		return observeEarlyResult(depsResult, operationOptions);
	}

	let resolvedResource: HumanResourcesResourceContext | undefined;
	if (config.resolveResource !== undefined) {
		const resourceResolution = await config.resolveResource(
			parsed.data,
			operationOptions,
			depsResult.data,
		);
		if (resourceResolution !== undefined && "ok" in resourceResolution) {
			if (!resourceResolution.ok) {
				return observeEarlyResult(resourceResolution, operationOptions);
			}
			resolvedResource = resourceResolution.data;
		} else {
			resolvedResource = resourceResolution;
		}
	}

	return runDomainAuthorizedOperation({
		operationId: params.operationId,
		operationKind: params.operationKind,
		data: parsed.data,
		options: operationOptions,
		parityResourceKind: config.parityResourceKind,
		resolveResource:
			resolvedResource === undefined ? undefined : async () => resolvedResource,
		resolveRequestedFields: config.resolveRequestedFields,
		project: config.project,
		execute: () => config.execute(parsed.data, depsResult.data),
	});
}

export async function runParsedAuthorizedCommand<
	TSchema extends ActorScopedSchema,
	TDeps,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: ParsedAuthorizedConfig<TSchema, TDeps, TOut, TProjected> & {
		command: HumanResourcesCommandId;
	},
): Promise<Result<TProjected>> {
	return runParsedAuthorizedOperation({
		input,
		options,
		operationId: config.command,
		operationKind: "command",
		config,
	});
}

export async function runParsedAuthorizedQuery<
	TSchema extends ActorScopedSchema,
	TDeps,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: ParsedAuthorizedConfig<TSchema, TDeps, TOut, TProjected> & {
		query: HumanResourcesQueryId;
	},
): Promise<Result<TProjected>> {
	return runParsedAuthorizedOperation({
		input,
		options,
		operationId: config.query,
		operationKind: "query",
		config,
	});
}
