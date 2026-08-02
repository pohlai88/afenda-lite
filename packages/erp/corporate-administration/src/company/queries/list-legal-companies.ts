import type { Result } from "@afenda/errors";
import type { z } from "zod";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
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
	dependencies: LegalCompanyQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<LegalCompanyListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listLegalCompaniesInputSchema.optional(),
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "listLegalCompanies",
		options,
		dependencies,
		work: async () =>
			dependencies.store.listLegalCompanies({
				organizationId: options.organizationId,
				asOf: parsed.data?.asOf,
				knownAt: parsed.data?.knownAt,
				pagination: cursorPaginationSchema.parse(parsed.data?.pagination ?? {}),
			}),
	});
}
