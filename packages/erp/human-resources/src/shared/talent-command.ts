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

type CommandDeps = {
	store: HumanResourcesStore;
	ports: MutationPorts;
};

type QueryDeps = {
	store: HumanResourcesStore;
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver:
		| import("../identity-resolver").HumanResourcesIdentityResolverPort
		| undefined;
};

type TalentCommandRunnerConfig<TSchema extends z.ZodType<ActorScoped>, TOut> = {
	schema: TSchema;
	invalidMessage: string;
	resolveResource?:
		| ((
				input: z.infer<TSchema>,
				options: HumanResourcesCommandOptions,
		  ) => Promise<HumanResourcesResourceContext | undefined>)
		| undefined;
	resolveRequestedFields?:
		| ((input: z.infer<TSchema>) => readonly string[] | undefined)
		| undefined;
	execute: (data: z.infer<TSchema>, deps: CommandDeps) => Promise<Result<TOut>>;
};

type TalentQueryRunnerConfig<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
	TProjected = TOut,
> = {
	schema: TSchema;
	invalidMessage: string;
	resolveResource?:
		| ((
				input: z.infer<TSchema>,
				options: HumanResourcesCommandOptions,
		  ) => Promise<HumanResourcesResourceContext | undefined>)
		| undefined;
	resolveRequestedFields?:
		| ((input: z.infer<TSchema>) => readonly string[] | undefined)
		| undefined;
	project?:
		| ((
				value: TOut,
				projection: HumanResourcesFieldProjection | undefined,
		  ) => TProjected)
		| undefined;
	execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
};

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
	return runParsedAuthorizedCommand(input, options, {
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
	return runParsedAuthorizedQuery<TSchema, QueryDeps, TOut, TProjected>(
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
	return runTalentQuery(input, options, {
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
