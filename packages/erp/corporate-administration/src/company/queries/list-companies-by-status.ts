import type { Result } from "@afenda/errors/result";

import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { toCanonicalInstant } from "../../kernel/dates";
import { cursorPaginationSchema } from "../../kernel/pagination";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { listCompaniesByStatusInputSchema } from "../schemas";
import type { LegalCompanyQueryDependencies } from "../store";
import type {
	LegalCompanyListPage,
	ListCompaniesByStatusInput,
} from "../types";

export async function listCompaniesByStatus(
	input: ListCompaniesByStatusInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: LegalCompanyQueryDependencies,
): Promise<Result<LegalCompanyListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listCompaniesByStatusInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.listCompaniesByStatus,
		},
	);
	if (!authorized.ok) return authorized;

	return dependencies.store.listCompaniesByStatus({
		organizationId: options.organizationId,
		status: parsed.data.status,
		asOf: parsed.data.asOf,
		knownAt:
			parsed.data.knownAt === undefined
				? undefined
				: toCanonicalInstant(parsed.data.knownAt),
		pagination: cursorPaginationSchema.parse(parsed.data.pagination ?? {}),
	});
}
