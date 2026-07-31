import type { Result } from "@afenda/errors";
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

type ResourceResolution =
	| HumanResourcesResourceContext
	| undefined
	| Result<HumanResourcesResourceContext | undefined>;

interface ParsedAuthorizedConfig<
	TSchema extends z.ZodType,
	TDeps,
	TOut,
	TProjected = TOut,
> {
	execute: (data: z.output<TSchema>, deps: TDeps) => Promise<Result<TOut>>;
	invalidMessage: string;
	parityResourceKind?: HumanResourcesResourceKind | undefined;
	project?:
		| ((
				value: TOut,
				projection: HumanResourcesFieldProjection | undefined,
		  ) => TProjected)
		| undefined;
	resolveDeps: (
		options: HumanResourcesCommandOptions,
		data: z.output<TSchema>,
	) => Result<TDeps> | Promise<Result<TDeps>>;
	/**
	 * Optional options override after parse (e.g. leave custom authorize proof).
	 */
	resolveOptions?:
		| ((
				options: HumanResourcesCommandOptions,
				data: z.output<TSchema>,
		  ) => Promise<Result<HumanResourcesCommandOptions>>)
		| undefined;
	resolveRequestedFields?:
		| ((input: z.output<TSchema>) => readonly string[] | undefined)
		| undefined;
	resolveResource?:
		| ((
				input: z.output<TSchema>,
				options: HumanResourcesCommandOptions,
				deps: TDeps,
		  ) => ResourceResolution | Promise<ResourceResolution>)
		| undefined;
	schema: TSchema & z.ZodType<HumanResourcesAuthorizedActorInput>;
}

async function runParsedAuthorizedOperation<
	TSchema extends z.ZodType,
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
		...(config.parityResourceKind === undefined
			? {}
			: { parityResourceKind: config.parityResourceKind }),
		...(resolvedResource === undefined
			? {}
			: { resolveResource: async () => resolvedResource }),
		...(config.resolveRequestedFields === undefined
			? {}
			: { resolveRequestedFields: config.resolveRequestedFields }),
		...(config.project === undefined ? {} : { project: config.project }),
		execute: () => config.execute(parsed.data, depsResult.data),
	});
}

export async function runParsedAuthorizedCommand<
	TSchema extends z.ZodType,
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
	return await runParsedAuthorizedOperation({
		input,
		options,
		operationId: config.command,
		operationKind: "command",
		config,
	});
}

export async function runParsedAuthorizedQuery<
	TSchema extends z.ZodType,
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
	return await runParsedAuthorizedOperation({
		input,
		options,
		operationId: config.query,
		operationKind: "query",
		config,
	});
}
