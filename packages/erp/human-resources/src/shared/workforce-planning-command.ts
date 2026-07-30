import { ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

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
import type { HumanResourcesResourceContext } from "./authorization-types";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "./domain-runner";
import { WORKFORCE_PLANNING_EMPLOYEE_ACTUAL_FIELDS } from "./field-projection";
import {
	type HumanResourcesAuthorizedActorInput,
	projectAuthorizedFields,
} from "./run-authorized-operation";

type ActorScoped = HumanResourcesAuthorizedActorInput;

interface CommandDeps {
	ports: MutationPorts;
	store: HumanResourcesStore;
}

interface QueryDeps {
	store: HumanResourcesStore;
}

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

export async function runWorkforcePlanningCommand<
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
		resolveResource: async (data) => resolveWorkforcePlanningResource(data),
		resolveDeps: (opts) => {
			const { store, ports } = resolveCommandDeps(opts);
			return ok({ store, ports });
		},
		execute: config.execute,
	});
}

export async function runWorkforcePlanningQuery<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: HumanResourcesQueryId;
		execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		resolveResource: async (data) => resolveWorkforcePlanningResource(data),
		resolveRequestedFields: () => WORKFORCE_PLANNING_READ_FIELDS,
		project: projectAuthorizedFields,
		resolveDeps: (opts) => {
			const { store } = resolveCommandDeps(opts);
			return ok({ store });
		},
		execute: config.execute,
	});
}
