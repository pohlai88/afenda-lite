import type { Result } from "@afenda/errors";
import { toCanonicalInstant } from "../../../kernel/dates";
import type { CorporateAdministrationQueryOptions } from "../../../kernel/execution/command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../../kernel/internal/query";
import { cursorPaginationSchema } from "../../../kernel/pagination";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
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
