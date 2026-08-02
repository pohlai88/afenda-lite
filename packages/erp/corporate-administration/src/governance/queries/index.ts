import { errorResult, type Result } from "@afenda/errors";

import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	getGovernanceBodyInputSchema,
	listGovernanceBodiesAsOfInputSchema,
	listGovernanceMembershipsAsOfInputSchema,
} from "../schemas";
import type { GovernanceQueryDependencies } from "../store";
import type {
	GetGovernanceBodyInput,
	GovernanceBody,
	GovernanceMembership,
	ListGovernanceBodiesAsOfInput,
	ListGovernanceMembershipsAsOfInput,
} from "../types";

type Dependencies = GovernanceQueryDependencies &
	CorporateAdministrationQueryKernelDependencies;

export async function getGovernanceBody(
	input: GetGovernanceBodyInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceBody>> {
	const parsed = parseCorporateAdministrationInput(
		getGovernanceBodyInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery<GovernanceBody>({
		operationId: "getGovernanceBody",
		options,
		dependencies,
		work: async () => {
			const result = await dependencies.governanceStore.getGovernanceBody({
				organizationId: options.organizationId,
				governanceBodyId: parsed.data.governanceBodyId,
			});
			if (!result.ok) {
				return result;
			}
			return result.data === null
				? notFound("governanceBody")
				: { ok: true, data: result.data };
		},
	});
}

export async function listGovernanceBodiesAsOf(
	input: ListGovernanceBodiesAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<readonly GovernanceBody[]>> {
	const parsed = parseCorporateAdministrationInput(
		listGovernanceBodiesAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listGovernanceBodiesAsOf",
		options,
		dependencies,
		work: () =>
			dependencies.governanceStore.listGovernanceBodiesAsOf({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				asOf: parsed.data.asOf,
				bodyType: parsed.data.bodyType,
				includeRetired: parsed.data.includeRetired,
			}),
	});
}

export async function listGovernanceMembershipsAsOf(
	input: ListGovernanceMembershipsAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<readonly GovernanceMembership[]>> {
	const parsed = parseCorporateAdministrationInput(
		listGovernanceMembershipsAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listGovernanceMembershipsAsOf",
		options,
		dependencies,
		work: () =>
			dependencies.governanceStore.listGovernanceMembershipsAsOf({
				organizationId: options.organizationId,
				governanceBodyId: parsed.data.governanceBodyId,
				asOf: parsed.data.asOf,
				memberPartyId: parsed.data.memberPartyId,
			}),
	});
}

function notFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}
