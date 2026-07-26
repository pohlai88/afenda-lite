import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import type { HumanResourcesPermission } from "../permissions";
import { HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ } from "../permissions";
import type { CurrencyLookupPort, MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import type {
	HumanResourcesFieldProjection,
	HumanResourcesResourceContext,
} from "./authorization-types";
import { assertHumanResourcesSupplementalAuthorization } from "./contextual-authorization";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "./domain-runner";
import { applySensitivityProjection } from "./field-projection";
import type { HumanResourcesAuthorizedActorInput } from "./run-authorized-operation";

type ActorScoped = HumanResourcesAuthorizedActorInput;

type CommandDeps = {
	store: HumanResourcesStore;
	ports: MutationPorts;
	currency: CurrencyLookupPort;
};

type QueryDeps = {
	store: HumanResourcesStore;
};

/** Apply highly_restricted compensation projection when resource-aware port is wired. */
export async function projectCompensationRecord<
	T extends Record<string, unknown>,
>(
	record: T,
	input: {
		organizationId: string;
		actorUserId: string;
		resourceId?: string;
		operationId: HumanResourcesCommandId | HumanResourcesQueryId;
		operationKind: "command" | "query";
		options: HumanResourcesCommandOptions;
		actorPermissions: Set<HumanResourcesPermission>;
	},
): Promise<Result<Partial<T>>> {
	const { resourceAwareAuthorization } = resolveCommandDeps(input.options);
	if (!resourceAwareAuthorization) {
		const projected = applySensitivityProjection(
			record,
			"highly_restricted",
			input.actorPermissions,
		);
		return { ok: true, data: projected.data };
	}

	const resource: HumanResourcesResourceContext = {
		organizationId: input.organizationId,
		kind: "compensation",
		...(input.resourceId === undefined ? {} : { resourceId: input.resourceId }),
	};

	const decision = await assertHumanResourcesSupplementalAuthorization(
		{
			operationId: input.operationId,
			operationKind: input.operationKind,
			requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			actor: {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: "",
			},
			resource,
		},
		input.options,
	);
	if (!decision.ok) return decision;

	const projected = applySensitivityProjection(
		record,
		"highly_restricted",
		input.actorPermissions,
	);
	return { ok: true, data: projected.data };
}

export async function assertCurrencyExists(
	currency: CurrencyLookupPort,
	currencyCode: string,
): Promise<Result<void>> {
	const exists = await currency.exists(currencyCode);
	if (!exists.ok) {
		return exists;
	}
	if (!exists.data) {
		return fail(
			"VALIDATION_ERROR",
			"Currency code is not recognized.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return { ok: true, data: undefined };
}

export async function runCompensationCommand<
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
	return runParsedAuthorizedCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		parityResourceKind: "compensation",
		resolveDeps: (opts) => {
			const { store, ports, currency } = resolveCommandDeps(opts);
			return ok({ store, ports, currency });
		},
		execute: config.execute,
	});
}

export async function runCompensationQuery<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: HumanResourcesQueryId;
		resolveRequestedFields?: (
			data: z.infer<TSchema>,
		) => readonly string[] | undefined;
		project?: (
			value: TOut,
			projection: import("./authorization-types").HumanResourcesFieldProjection | undefined,
		) => TProjected;
		execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
	},
): Promise<Result<TProjected>> {
	return runParsedAuthorizedQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		parityResourceKind: "compensation",
		resolveRequestedFields: config.resolveRequestedFields,
		project: config.project,
		resolveDeps: (opts) => {
			const { store } = resolveCommandDeps(opts);
			return ok({ store });
		},
		execute: config.execute,
	});
}
