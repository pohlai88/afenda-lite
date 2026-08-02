import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import type { HumanResourcesResourceContext } from "../../kernel/authorization/authorization-types";
import type { HumanResourcesAuthorizedActorInput } from "../../kernel/authorization/run-authorized-operation";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../../kernel/execution/command-options";
import { runParsedAuthorizedQuery } from "../../kernel/execution/domain-runner";
import type { HumanResourcesEmployeeId } from "../../kernel/identity/brands";
import { resolveCompensationManagerEmployeeId } from "../compensation-benefits/run-operation";
import type { HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERY_IDS } from "./operation-registry";
import {
	type HumanResourcesPayrollHandoffStoreMethod,
	type HumanResourcesPayrollHandoffStoreProjection,
	projectPayrollHandoffStore,
} from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type PayrollHandoffQueryId =
	(typeof HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERY_IDS)[number];

async function resolvePayrollHandoffResource(
	data: ActorScoped & { employeeId: HumanResourcesEmployeeId },
	options: HumanResourcesCommandOptions,
	store: HumanResourcesPayrollHandoffStoreProjection<
		readonly ["getPrimaryManagerForEmployee"]
	>,
): Promise<Result<HumanResourcesResourceContext>> {
	const manager = await resolveCompensationManagerEmployeeId({
		data,
		options,
		store,
		subjectEmployeeId: data.employeeId,
	});
	if (!manager.ok) {
		return manager;
	}

	return errorResult.ok({
		organizationId: data.organizationId,
		kind: "compensation",
		resourceId: data.employeeId,
		subjectEmployeeId: data.employeeId,
		...(manager.data === undefined ? {} : { managerEmployeeId: manager.data }),
	});
}

export async function runPayrollHandoffCapabilityQuery<
	const TMethods extends readonly HumanResourcesPayrollHandoffStoreMethod[],
	TSchema extends z.ZodType<
		ActorScoped & { employeeId: HumanResourcesEmployeeId }
	>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: { store: HumanResourcesPayrollHandoffStoreProjection<TMethods> },
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: PayrollHandoffQueryId;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery<
		TSchema,
		{
			authorizationResource: HumanResourcesResourceContext | undefined;
			store: HumanResourcesPayrollHandoffStoreProjection<TMethods>;
		},
		TOut
	>(input, options, {
		...config,
		resolveResource: (_data, _options, { authorizationResource }) =>
			authorizationResource,
		resolveDeps: async (resolvedOptions, data) => {
			const { store } = resolveCommandDeps(resolvedOptions);
			const authorizationResource = await resolvePayrollHandoffResource(
				data,
				resolvedOptions,
				projectPayrollHandoffStore(store, [
					"getPrimaryManagerForEmployee",
				] as const),
			);
			if (!authorizationResource.ok) {
				return authorizationResource;
			}
			return errorResult.ok({
				store: projectPayrollHandoffStore(store, config.storeMethods),
				authorizationResource: authorizationResource.data,
			});
		},
		execute: (data, { store }) => config.execute(data, { store }),
	});
}
