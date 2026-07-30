import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { HumanResourcesIdentityResolverPort } from "../identity-resolver";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import type { MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesFieldProjection,
	HumanResourcesResourceContext,
} from "./authorization-types";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "./domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "./run-authorized-operation";

type ActorScoped = HumanResourcesAuthorizedActorInput;

interface CommandDeps {
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
	ports: MutationPorts;
	store: HumanResourcesStore;
}

interface QueryDeps {
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
	store: HumanResourcesStore;
}

export async function runEmployeeRelationsCommand<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		command: HumanResourcesCommandId;
		execute: (
			data: z.infer<TSchema>,
			deps: CommandDeps,
		) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		parityResourceKind: "employee_case",
		resolveDeps: (opts) => {
			const { store, ports, authorization, identityResolver } =
				resolveCommandDeps(opts);
			return ok({ store, ports, authorization, identityResolver });
		},
		execute: config.execute,
	});
}

export async function runEmployeeRelationsQuery<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: HumanResourcesQueryId;
		resolveResource?: (
			data: z.infer<TSchema>,
			options: HumanResourcesCommandOptions,
		) => Promise<HumanResourcesResourceContext | undefined>;
		project?: (
			value: TOut,
			projection: HumanResourcesFieldProjection | undefined,
		) => TOut;
		execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		parityResourceKind: "employee_case",
		resolveResource: config.resolveResource,
		project: config.project,
		resolveDeps: (opts) => {
			const { store, authorization, identityResolver } =
				resolveCommandDeps(opts);
			return ok({ store, authorization, identityResolver });
		},
		execute: config.execute,
	});
}

export async function requireEmployeeRelationsIdentityResolver(
	identityResolver: HumanResourcesIdentityResolverPort | undefined,
): Promise<Result<HumanResourcesIdentityResolverPort>> {
	if (!identityResolver) {
		return await fail(
			"UNAUTHORIZED",
			"Human Resources identity resolver port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}
	return await ok(identityResolver);
}
