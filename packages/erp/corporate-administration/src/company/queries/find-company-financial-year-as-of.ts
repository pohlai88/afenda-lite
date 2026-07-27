import { fail, type Result } from "@afenda/errors/result";
import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { findCompanyFinancialYearAsOfInputSchema } from "../schemas";
import type { CompanyFinancialYearQueryDependencies } from "../store";
import type {
	CompanyFinancialYear,
	FindCompanyFinancialYearAsOfInput,
} from "../types";

export async function findCompanyFinancialYearAsOf(
	input: FindCompanyFinancialYearAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyFinancialYearQueryDependencies,
): Promise<Result<CompanyFinancialYear | null>> {
	const parsed = parseCorporateAdministrationInput(
		findCompanyFinancialYearAsOfInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.findCompanyFinancialYearAsOf,
		},
	);
	if (!authorized.ok) return authorized;

	const current = await dependencies.store.getLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
	});
	if (!current.ok) return current;
	if (current.data === null) {
		return fail(
			"NOT_FOUND",
			"Corporate Administration legal company was not found.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_NOT_FOUND",
				{ entityType: "legalCompany" },
			),
		);
	}

	return dependencies.financialYearStore.findCompanyFinancialYearAsOf({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
		knownAt:
			parsed.data.knownAt === undefined
				? undefined
				: toCanonicalInstant(parsed.data.knownAt),
	});
}
