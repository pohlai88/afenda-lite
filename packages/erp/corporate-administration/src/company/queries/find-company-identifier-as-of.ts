import { fail, type Result } from "@afenda/errors/result";
import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { findCompanyIdentifierAsOfInputSchema } from "../schemas";
import type { CompanyIdentifierQueryDependencies } from "../store";
import type {
	CompanyIdentifier,
	FindCompanyIdentifierAsOfInput,
} from "../types";

export async function findCompanyIdentifierAsOf(
	input: FindCompanyIdentifierAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyIdentifierQueryDependencies,
): Promise<Result<CompanyIdentifier | null>> {
	const parsed = parseCorporateAdministrationInput(
		findCompanyIdentifierAsOfInputSchema,
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
				CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.findCompanyIdentifierAsOf,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const current = await dependencies.store.getLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
	});
	if (!current.ok) {
		return current;
	}
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

	return dependencies.identifierStore.findCompanyIdentifierAsOf({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		identifierType: parsed.data.identifierType,
		jurisdictionCode: parsed.data.jurisdictionCode,
		issuingAuthorityCode:
			parsed.data.issuingAuthorityCode ?? parsed.data.authorityCode,
		asOf: parsed.data.asOf,
		knownAt:
			parsed.data.knownAt === undefined
				? undefined
				: toCanonicalInstant(parsed.data.knownAt),
	});
}
