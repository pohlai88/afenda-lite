import { errorResult, type Result } from "@afenda/errors";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
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
	dependencies: CompanyFinancialYearQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<CompanyFinancialYear | null>> {
	const parsed = parseCorporateAdministrationInput(
		findCompanyFinancialYearAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "findCompanyFinancialYearAsOf",
		options,
		dependencies,
		work: async () => {
			const current = await dependencies.store.getLegalCompany({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage:
						"Corporate Administration legal company was not found.",
				});
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
		},
	});
}
