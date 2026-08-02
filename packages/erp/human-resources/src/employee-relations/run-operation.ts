import { errorResult, type Result } from "@afenda/errors";
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
import type { MutationPorts } from "../ports";
import type {
	HumanResourcesFieldProjection,
	HumanResourcesResourceContext,
} from "../shared/authorization-types";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../shared/domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import type {
	HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS,
	HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_IDS,
} from "./operation-registry";
import {
	type HumanResourcesEmployeeRelationsStoreMethod,
	type HumanResourcesEmployeeRelationsStoreProjection,
	projectEmployeeRelationsStore,
} from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;

export async function runEmployeeRelationsCapabilityCommand<
	const TMethods extends readonly HumanResourcesEmployeeRelationsStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: (typeof HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS)[number];
		execute: (
			data: z.infer<TSchema>,
			deps: {
				ports: MutationPorts;
				store: HumanResourcesEmployeeRelationsStoreProjection<TMethods>;
			},
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		...config,
		parityResourceKind: "employee_case",
		resolveDeps: (resolvedOptions) => {
			const { store, ports } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectEmployeeRelationsStore(store, config.storeMethods),
				ports,
			});
		},
	});
}

export async function runEmployeeRelationsCapabilityQuery<
	const TMethods extends readonly HumanResourcesEmployeeRelationsStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: { store: HumanResourcesEmployeeRelationsStoreProjection<TMethods> },
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		project?: (
			value: TOut,
			projection: HumanResourcesFieldProjection | undefined,
		) => TOut;
		query: (typeof HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_IDS)[number];
		resolveResource?: (
			data: z.infer<TSchema>,
			options: HumanResourcesCommandOptions,
		) => Promise<HumanResourcesResourceContext | undefined>;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		...config,
		parityResourceKind: "employee_case",
		resolveDeps: (resolvedOptions) => {
			const { store } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectEmployeeRelationsStore(store, config.storeMethods),
			});
		},
	});
}

export async function requireEmployeeRelationsIdentityResolver(
	identityResolver: HumanResourcesIdentityResolverPort | undefined,
): Promise<Result<HumanResourcesIdentityResolverPort>> {
	if (identityResolver === undefined) {
		return await errorResult.fail("UNAUTHORIZED", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
			),
		});
	}
	return await errorResult.ok(identityResolver);
}
