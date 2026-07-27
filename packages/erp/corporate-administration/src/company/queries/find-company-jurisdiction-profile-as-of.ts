import type { Result } from "@afenda/errors/result";
import type { z } from "zod";
import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { findCompanyJurisdictionProfileAsOfInputSchema } from "../schemas";
import type { LegalCompanyQueryDependencies } from "../store";
import type { CompanyJurisdictionProfile } from "../types";

export type FindCompanyJurisdictionProfileAsOfInput = z.input<
	typeof findCompanyJurisdictionProfileAsOfInputSchema
>;

export async function findCompanyJurisdictionProfileAsOf(
	input: FindCompanyJurisdictionProfileAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: LegalCompanyQueryDependencies,
): Promise<Result<CompanyJurisdictionProfile | null>> {
	const parsed = parseCorporateAdministrationInput(
		findCompanyJurisdictionProfileAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.findCompanyJurisdictionProfileAsOf,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return dependencies.store.findJurisdictionProfileAsOf({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
		knownAt: parsed.data.knownAt,
	});
}
