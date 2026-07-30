import { ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";
import type { HumanResourcesEmployeeId } from "../brands";
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
import { resolveTalentProfileResourceForEmployee } from "./talent-resource";

type ActorScoped = HumanResourcesAuthorizedActorInput;

interface CommandDeps {
	ports: MutationPorts;
	store: HumanResourcesStore;
}

interface QueryDeps {
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver:
		| import("../identity-resolver").HumanResourcesIdentityResolverPort
		| undefined;
	store: HumanResourcesStore;
}

interface TalentCommandRunnerConfig<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
> {
	execute: (data: z.infer<TSchema>, deps: CommandDeps) => Promise<Result<TOut>>;
	invalidMessage: string;
	resolveRequestedFields?:
		| ((input: z.infer<TSchema>) => readonly string[] | undefined)
		| undefined;
	resolveResource?:
		| ((
				input: z.infer<TSchema>,
				options: HumanResourcesCommandOptions,
		  ) => Promise<HumanResourcesResourceContext | undefined>)
		| undefined;
	schema: TSchema;
}

interface TalentQueryRunnerConfig<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
	TProjected = TOut,
> {
	execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
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
				options: HumanResourcesCommandOptions,
		  ) => Promise<HumanResourcesResourceContext | undefined>)
		| undefined;
	schema: TSchema;
}

/**
 * Shared authorize → parse → execute path for talent mutations.
 */
export async function runTalentCommand<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: TalentCommandRunnerConfig<TSchema, TOut> & {
		command: HumanResourcesCommandId;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		resolveResource: config.resolveResource,
		resolveRequestedFields: config.resolveRequestedFields,
		resolveDeps: (opts) => {
			const { store, ports } = resolveCommandDeps(opts);
			return ok({ store, ports });
		},
		execute: config.execute,
	});
}

export async function runTalentQuery<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: TalentQueryRunnerConfig<TSchema, TOut, TProjected> & {
		query: HumanResourcesQueryId;
	},
): Promise<Result<TProjected>> {
	return await runParsedAuthorizedQuery<TSchema, QueryDeps, TOut, TProjected>(
		input,
		options,
		{
			schema: config.schema,
			invalidMessage: config.invalidMessage,
			query: config.query,
			resolveResource: config.resolveResource,
			resolveRequestedFields: config.resolveRequestedFields,
			project: config.project,
			resolveDeps: (opts) => {
				const { store, authorization, identityResolver } =
					resolveCommandDeps(opts);
				return ok({ store, authorization, identityResolver });
			},
			execute: config.execute,
		},
	);
}

/** Employee-scoped talent reads routed through the contextual authorization facade. */
export async function runTalentEmployeeScopedQuery<
	TSchema extends z.ZodType<ActorScoped & { employeeId: string }>,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: TalentQueryRunnerConfig<TSchema, TOut, TProjected> & {
		query: HumanResourcesQueryId;
	},
): Promise<Result<TProjected>> {
	return await runTalentQuery(input, options, {
		...config,
		resolveResource: async (data, opts) =>
			resolveTalentProfileResourceForEmployee(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId as HumanResourcesEmployeeId,
				},
				opts,
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
} from "./talent-resource";
