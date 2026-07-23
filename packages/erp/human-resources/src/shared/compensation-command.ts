import { fail, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import {
	type HumanResourcesResourceAwareAuthorizationPort,
	requireHumanResourcesCommandPermission,
	requireHumanResourcesQueryPermission,
	requireHumanResourcesResourceAwarePermission,
} from "../authorization";
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
import { parseHumanResourcesInput } from "../parse-input";
import { HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ } from "../permissions";
import type { CurrencyLookupPort, MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import { applySensitivityProjection } from "./field-projection";
import type { HumanResourcesPermission } from "../authorization";

type ActorScoped = {
	organizationId: string;
	actorUserId: string;
};

type CommandDeps = {
	store: HumanResourcesStore;
	ports: MutationPorts;
	currency: CurrencyLookupPort;
};

type QueryDeps = {
	store: HumanResourcesStore;
	resourceAwareAuthorization: HumanResourcesResourceAwareAuthorizationPort | undefined;
};

/** Apply highly_restricted compensation projection when resource-aware port is wired. */
export async function projectCompensationRecord<T extends Record<string, unknown>>(
	record: T,
	input: {
		organizationId: string;
		actorUserId: string;
		resourceId?: string;
		resourceAwareAuthorization?: HumanResourcesResourceAwareAuthorizationPort;
		actorPermissions: Set<HumanResourcesPermission>;
	},
): Promise<Result<Partial<T>>> {
	if (!input.resourceAwareAuthorization) {
		const projected = applySensitivityProjection(
			record,
			"highly_restricted",
			input.actorPermissions,
		);
		return { ok: true, data: projected.data };
	}

	const decision = await requireHumanResourcesResourceAwarePermission(
		input.resourceAwareAuthorization,
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			permission: HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			resourceType: "compensation",
			resourceId: input.resourceId,
			sensitivity: "highly_restricted",
		},
	);
	if (!decision.ok) return decision;

	if (!decision.data.projectedFields?.length) {
		return { ok: true, data: record };
	}

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
	const parsed = parseHumanResourcesInput(
		config.schema,
		input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, currency, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: config.command,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, { store, ports, currency });
}

export async function runCompensationQuery<
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
	const parsed = parseHumanResourcesInput(
		config.schema,
		input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization, resourceAwareAuthorization } =
		resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: config.query,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, { store, resourceAwareAuthorization });
}
