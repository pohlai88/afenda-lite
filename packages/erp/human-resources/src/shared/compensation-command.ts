import { fail, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import {
	requireHumanResourcesCommandPermission,
	requireHumanResourcesQueryPermission,
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
import type { CurrencyLookupPort, MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";

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
};

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

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: config.query,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, { store });
}
