import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import type { HumanResourcesEmployeeId } from "../brands";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import type { MutationPorts } from "../ports";
import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesFieldProjection,
	HumanResourcesResourceContext,
} from "../shared/authorization-types";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../shared/domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import {
	resolveTalentProfileResourceForEmployee,
	type TalentResourceDeps,
} from "../shared/talent-resource";
import type {
	HUMAN_RESOURCES_TALENT_COMMAND_IDS,
	HUMAN_RESOURCES_TALENT_QUERY_IDS,
} from "./operation-registry";
import {
	type HumanResourcesTalentStoreMethod,
	type HumanResourcesTalentStoreProjection,
	projectTalentAuthorizationStore,
	projectTalentStore,
} from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;

interface CommandDeps<
	TMethods extends readonly HumanResourcesTalentStoreMethod[],
> {
	ports: MutationPorts;
	store: HumanResourcesTalentStoreProjection<TMethods>;
}

interface QueryDeps<
	TMethods extends readonly HumanResourcesTalentStoreMethod[],
> {
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver:
		| import("../identity-resolver").HumanResourcesIdentityResolverPort
		| undefined;
	store: HumanResourcesTalentStoreProjection<TMethods>;
}

type TalentCommandId = (typeof HUMAN_RESOURCES_TALENT_COMMAND_IDS)[number];
export type TalentQueryId = (typeof HUMAN_RESOURCES_TALENT_QUERY_IDS)[number];

interface TalentCommandRunnerConfig<
	TMethods extends readonly HumanResourcesTalentStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
> {
	execute: (
		data: z.infer<TSchema>,
		deps: CommandDeps<TMethods>,
	) => Promise<Result<TOut>>;
	invalidMessage: string;
	resolveRequestedFields?:
		| ((input: z.infer<TSchema>) => readonly string[] | undefined)
		| undefined;
	resolveResource?:
		| ((
				input: z.infer<TSchema>,
				deps: TalentResourceDeps,
		  ) => Promise<HumanResourcesResourceContext | undefined>)
		| undefined;
	schema: TSchema;
	storeMethods: TMethods;
}

interface TalentQueryRunnerConfig<
	TMethods extends readonly HumanResourcesTalentStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
	TProjected = TOut,
> {
	execute: (
		data: z.infer<TSchema>,
		deps: QueryDeps<TMethods>,
	) => Promise<Result<TOut>>;
	invalidMessage: string;
	project?:
		| ((
				value: TOut,
				projection: HumanResourcesFieldProjection | undefined,
		  ) => TProjected)
		| undefined;
	resolveRequestedFields?:
		| ((input: z.infer<TSchema>) => readonly string[] | undefined)
		| undefined;
	resolveResource?:
		| ((
				input: z.infer<TSchema>,
				deps: TalentResourceDeps,
		  ) => Promise<HumanResourcesResourceContext | undefined>)
		| undefined;
	schema: TSchema;
	storeMethods: TMethods;
}

/**
 * Shared authorize → parse → execute path for talent mutations.
 */
export async function runTalentCapabilityCommand<
	const TMethods extends readonly HumanResourcesTalentStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: TalentCommandRunnerConfig<TMethods, TSchema, TOut> & {
		command: TalentCommandId;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand<
		TSchema,
		{
			ports: MutationPorts;
			resourceDeps: TalentResourceDeps;
			store: HumanResourcesTalentStoreProjection<TMethods>;
		},
		TOut
	>(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		resolveResource: (data, _options, { resourceDeps }) =>
			config.resolveResource?.(data, resourceDeps),
		resolveRequestedFields: config.resolveRequestedFields,
		resolveDeps: (opts) => {
			const { store, ports } = resolveCommandDeps(opts);
			return errorResult.ok({
				store: projectTalentStore(store, config.storeMethods),
				ports,
				resourceDeps: {
					identityResolver: resolveCommandDeps(opts).identityResolver,
					store: projectTalentAuthorizationStore(store),
				},
			});
		},
		execute: (data, { store, ports }) => config.execute(data, { store, ports }),
	});
}

export async function runTalentCapabilityQuery<
	const TMethods extends readonly HumanResourcesTalentStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: TalentQueryRunnerConfig<TMethods, TSchema, TOut, TProjected> & {
		query: TalentQueryId;
	},
): Promise<Result<TProjected>> {
	return await runParsedAuthorizedQuery<
		TSchema,
		{
			authorization: HumanResourcesAuthorizationPort | undefined;
			identityResolver:
				| import("../identity-resolver").HumanResourcesIdentityResolverPort
				| undefined;
			resourceDeps: TalentResourceDeps;
			store: HumanResourcesTalentStoreProjection<TMethods>;
		},
		TOut,
		TProjected
	>(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		resolveResource: (data, _options, { resourceDeps }) =>
			config.resolveResource?.(data, resourceDeps),
		resolveRequestedFields: config.resolveRequestedFields,
		project: config.project,
		resolveDeps: (opts) => {
			const { store, authorization, identityResolver } =
				resolveCommandDeps(opts);
			return errorResult.ok({
				store: projectTalentStore(store, config.storeMethods),
				authorization,
				identityResolver,
				resourceDeps: {
					identityResolver,
					store: projectTalentAuthorizationStore(store),
				},
			});
		},
		execute: (data, { store, authorization, identityResolver }) =>
			config.execute(data, { store, authorization, identityResolver }),
	});
}

/** Employee-scoped talent reads routed through the contextual authorization facade. */
export async function runTalentEmployeeScopedCapabilityQuery<
	const TMethods extends readonly HumanResourcesTalentStoreMethod[],
	TSchema extends z.ZodType<ActorScoped & { employeeId: string }>,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: TalentQueryRunnerConfig<TMethods, TSchema, TOut, TProjected> & {
		query: TalentQueryId;
	},
): Promise<Result<TProjected>> {
	return await runTalentCapabilityQuery(input, options, {
		...config,
		resolveResource: async (data, deps) =>
			resolveTalentProfileResourceForEmployee(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId as HumanResourcesEmployeeId,
				},
				deps,
			),
	});
}

export {
	resolveActorTalentProfileResource,
	resolveCompetencyAssessmentResource,
	resolveTalentProfileResourceForEmployee,
	resolveTalentProfileResourceFromCareerPlan,
	resolveTalentProfileResourceFromTalentProfile,
	talentProfileResource,
} from "../shared/talent-resource";
