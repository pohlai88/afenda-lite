import { fail, type Result } from "@afenda/errors/result";
import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { findCompanyNameAsOfInputSchema } from "../schemas";
import type { CompanyNameQueryDependencies } from "../store";
import type { CompanyName, FindCompanyNameAsOfInput } from "../types";

export async function findCompanyNameAsOf(
	input: FindCompanyNameAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyNameQueryDependencies,
): Promise<Result<CompanyName | null>> {
	const parsed = parseCorporateAdministrationInput(
		findCompanyNameAsOfInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.findCompanyNameAsOf,
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

	return dependencies.nameStore.findCompanyNameAsOf({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		nameType: parsed.data.nameType,
		languageCode: parsed.data.languageCode,
		asOf: parsed.data.asOf,
		knownAt:
			parsed.data.knownAt === undefined
				? undefined
				: toCanonicalInstant(parsed.data.knownAt),
	});
}
