import { fail, type Result } from "@afenda/errors/result";

import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
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

export async function getGovernanceBody(
	input: GetGovernanceBodyInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: GovernanceQueryDependencies,
): Promise<Result<GovernanceBody>> {
	const parsed = parseCorporateAdministrationInput(
		getGovernanceBodyInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "getGovernanceBody");
	if (!authorized.ok) return authorized;
	const result = await dependencies.governanceStore.getGovernanceBody({
		organizationId: options.organizationId,
		governanceBodyId: parsed.data.governanceBodyId,
	});
	if (!result.ok) return result;
	return result.data === null
		? notFound("governanceBody")
		: { ok: true, data: result.data };
}

export async function listGovernanceBodiesAsOf(
	input: ListGovernanceBodiesAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: GovernanceQueryDependencies,
): Promise<Result<readonly GovernanceBody[]>> {
	const parsed = parseCorporateAdministrationInput(
		listGovernanceBodiesAsOfInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "listGovernanceBodiesAsOf");
	if (!authorized.ok) return authorized;
	return dependencies.governanceStore.listGovernanceBodiesAsOf({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
		bodyType: parsed.data.bodyType,
		includeRetired: parsed.data.includeRetired,
	});
}

export async function listGovernanceMembershipsAsOf(
	input: ListGovernanceMembershipsAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: GovernanceQueryDependencies,
): Promise<Result<readonly GovernanceMembership[]>> {
	const parsed = parseCorporateAdministrationInput(
		listGovernanceMembershipsAsOfInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "listGovernanceMembershipsAsOf");
	if (!authorized.ok) return authorized;
	return dependencies.governanceStore.listGovernanceMembershipsAsOf({
		organizationId: options.organizationId,
		governanceBodyId: parsed.data.governanceBodyId,
		asOf: parsed.data.asOf,
		memberPartyId: parsed.data.memberPartyId,
	});
}

function authorize(
	options: CorporateAdministrationQueryOptions,
	query: keyof typeof CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
) {
	return requireCorporateAdministrationPermission(options.authorization, {
		organizationId: options.organizationId,
		actorUserId: options.actorUserId,
		permission: CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS[query],
	});
}

function notFound(entityType: string): Result<never> {
	return fail(
		"NOT_FOUND",
		"Corporate Administration record was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND", {
			entityType,
		}),
	);
}
