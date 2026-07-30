import type { HumanResourcesEmployeeId } from "../brands";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import type { HumanResourcesResourceContext } from "./authorization-types";
import type { HumanResourcesAuthorizedActorInput } from "./run-authorized-operation";

export function employeeProfileResource(input: {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	resourceId?: string | undefined;
}): HumanResourcesResourceContext {
	return {
		organizationId: input.organizationId,
		kind: "employee",
		subjectEmployeeId: input.employeeId,
		...(input.resourceId === undefined ? {} : { resourceId: input.resourceId }),
	};
}

async function withPrimaryManagerOnResource(
	context: HumanResourcesResourceContext,
	employeeId: HumanResourcesEmployeeId,
	asOf: string,
	options: HumanResourcesCommandOptions,
): Promise<HumanResourcesResourceContext> {
	const { store } = resolveCommandDeps(options);
	const primaryManager = await store.getPrimaryManagerForEmployee({
		organizationId: context.organizationId,
		employeeId,
		asOf,
	});
	if (primaryManager.ok && primaryManager.data !== null) {
		return { ...context, managerEmployeeId: primaryManager.data };
	}
	return context;
}

/** Subject-scoped employee profile resource with primary manager for policy evaluation. */
export async function resolveEmployeeProfileResource(
	input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
		resourceId?: string | undefined;
	},
	options: HumanResourcesCommandOptions,
): Promise<HumanResourcesResourceContext> {
	return await withPrimaryManagerOnResource(
		employeeProfileResource(input),
		input.employeeId,
		input.asOf,
		options,
	);
}

export async function resolveEmployeeProfileResourceFromInput(
	data: HumanResourcesAuthorizedActorInput & {
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	},
	options: HumanResourcesCommandOptions,
): Promise<HumanResourcesResourceContext> {
	return await resolveEmployeeProfileResource(
		{
			organizationId: data.organizationId,
			employeeId: data.employeeId,
			asOf: data.asOf,
		},
		options,
	);
}
