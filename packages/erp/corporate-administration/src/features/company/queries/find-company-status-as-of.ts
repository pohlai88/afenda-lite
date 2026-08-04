import { errorResult, type Result } from "@afenda/errors";
import { toCanonicalInstant } from "../../../kernel/dates";
import type { CorporateAdministrationQueryOptions } from "../../../kernel/execution/command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../../kernel/internal/query";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import { findCompanyStatusAsOfInputSchema } from "../schemas";
import type { LegalCompanyQueryDependencies } from "../store";
import type {
	CompanyStatusHistory,
	FindCompanyStatusAsOfInput,
} from "../types";

export async function findCompanyStatusAsOf(
	input: FindCompanyStatusAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: LegalCompanyQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<CompanyStatusHistory | null>> {
	const parsed = parseCorporateAdministrationInput(
		findCompanyStatusAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "findCompanyStatusAsOf",
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

			return dependencies.store.findCompanyStatusAsOf({
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
