import type { Result } from "@afenda/errors/result";
import type { z } from "zod";
import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { cursorPaginationSchema } from "../../kernel/pagination";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { listLegalCompaniesInputSchema } from "../schemas";
import type { LegalCompanyQueryDependencies } from "../store";
import type { LegalCompanyListPage } from "../types";

export type ListLegalCompaniesInput = z.input<
	typeof listLegalCompaniesInputSchema
>;

export async function listLegalCompanies(
	input: ListLegalCompaniesInput | undefined,
	options: CorporateAdministrationQueryOptions,
	dependencies: LegalCompanyQueryDependencies,
): Promise<Result<LegalCompanyListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listLegalCompaniesInputSchema.optional(),
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
			permission: CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.listLegalCompanies,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return dependencies.store.listLegalCompanies({
		organizationId: options.organizationId,
		asOf: parsed.data?.asOf,
		knownAt: parsed.data?.knownAt,
		pagination: cursorPaginationSchema.parse(parsed.data?.pagination ?? {}),
	});
}
