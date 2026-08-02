import type { Result } from "@afenda/errors";

import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
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
	dependencies: LegalCompanyQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<LegalCompanyListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listCompaniesByStatusInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "listCompaniesByStatus",
		options,
		dependencies,
		work: async () =>
			dependencies.store.listCompaniesByStatus({
				organizationId: options.organizationId,
				status: parsed.data.status,
				asOf: parsed.data.asOf,
				knownAt:
					parsed.data.knownAt === undefined
						? undefined
						: toCanonicalInstant(parsed.data.knownAt),
				pagination: cursorPaginationSchema.parse(parsed.data.pagination ?? {}),
			}),
	});
}
