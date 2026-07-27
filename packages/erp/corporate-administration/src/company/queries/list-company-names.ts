import { fail, type Result } from "@afenda/errors/result";
import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { listCompanyNamesInputSchema } from "../schemas";
import type {
	CompanyNameListPage,
	CompanyNameQueryDependencies,
} from "../store";
import type { ListCompanyNamesInput } from "../types";

export async function listCompanyNames(
	input: ListCompanyNamesInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyNameQueryDependencies,
): Promise<Result<CompanyNameListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listCompanyNamesInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission: CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.listCompanyNames,
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

	return dependencies.nameStore.listCompanyNames({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		nameType: parsed.data.nameType,
		languageCode: parsed.data.languageCode,
		activeAt: parsed.data.activeAt,
		includeFormer: parsed.data.includeFormer ?? false,
		cursor: parsed.data.cursor,
		pageSize: parsed.data.pageSize,
		knownAt:
			parsed.data.knownAt === undefined
				? undefined
				: toCanonicalInstant(parsed.data.knownAt),
		ordering: "name_type_language_effective_from_desc_recorded_at_desc_id",
	});
}
