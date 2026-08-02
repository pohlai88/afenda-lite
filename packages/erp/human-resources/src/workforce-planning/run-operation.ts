import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import type { MutationPorts } from "../ports";
import type { HumanResourcesResourceContext } from "../shared/authorization-types";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../shared/domain-runner";
import { WORKFORCE_PLANNING_EMPLOYEE_ACTUAL_FIELDS } from "../shared/field-projection";
import {
	type HumanResourcesAuthorizedActorInput,
	projectAuthorizedFields,
} from "../shared/run-authorized-operation";
import type {
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS,
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERY_IDS,
} from "./operation-registry";
import type { HumanResourcesWorkforcePlanningCapabilityStore } from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type WorkforcePlanningStoreMethod =
	keyof HumanResourcesWorkforcePlanningCapabilityStore;
type WorkforcePlanningStoreProjection<
	TMethods extends readonly WorkforcePlanningStoreMethod[],
> = Pick<HumanResourcesWorkforcePlanningCapabilityStore, TMethods[number]>;

const WORKFORCE_PLANNING_RESOURCE_ID_FIELDS = [
	"planId",
	"planLineId",
	"reservationId",
	"requisitionId",
] as const;

const WORKFORCE_PLANNING_READ_FIELDS = [
	"id",
	...WORKFORCE_PLANNING_EMPLOYEE_ACTUAL_FIELDS,
] as const;

function readStringField(input: object, field: string): string | undefined {
	const descriptor = Object.getOwnPropertyDescriptor(input, field);
	return typeof descriptor?.value === "string" ? descriptor.value : undefined;
}

function resolveWorkforcePlanningResource(
	input: ActorScoped,
): HumanResourcesResourceContext {
	const resourceId = WORKFORCE_PLANNING_RESOURCE_ID_FIELDS.map((field) =>
		readStringField(input, field),
	).find((value) => value !== undefined);
	return {
		organizationId: input.organizationId,
		kind: "headcount_plan",
		...(resourceId === undefined ? {} : { resourceId }),
	};
}

function projectWorkforcePlanningStore<
	const TMethods extends readonly WorkforcePlanningStoreMethod[],
>(
	store: HumanResourcesWorkforcePlanningCapabilityStore,
	_methods: TMethods,
): WorkforcePlanningStoreProjection<TMethods> {
	return store;
}

export async function runWorkforcePlanningCapabilityCommand<
	const TMethods extends readonly WorkforcePlanningStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: (typeof HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS)[number];
		execute: (
			data: z.infer<TSchema>,
			deps: {
				ports: MutationPorts;
				store: WorkforcePlanningStoreProjection<TMethods>;
			},
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		...config,
		resolveResource: async (data) => resolveWorkforcePlanningResource(data),
		resolveDeps: (resolvedOptions) => {
			const { store, ports } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectWorkforcePlanningStore(store, config.storeMethods),
				ports,
			});
		},
	});
}

export async function runWorkforcePlanningCapabilityQuery<
	const TMethods extends readonly WorkforcePlanningStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: { store: WorkforcePlanningStoreProjection<TMethods> },
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: (typeof HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERY_IDS)[number];
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		...config,
		resolveResource: async (data) => resolveWorkforcePlanningResource(data),
		resolveRequestedFields: () => WORKFORCE_PLANNING_READ_FIELDS,
		project: projectAuthorizedFields,
		resolveDeps: (resolvedOptions) => {
			const { store } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectWorkforcePlanningStore(store, config.storeMethods),
			});
		},
	});
}
