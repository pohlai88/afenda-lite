import { errorResult, type Result } from "@afenda/errors";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { findCompanyNameAsOfInputSchema } from "../schemas";
import type { CompanyNameQueryDependencies } from "../store";
import type { CompanyName, FindCompanyNameAsOfInput } from "../types";

export async function findCompanyNameAsOf(
	input: FindCompanyNameAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyNameQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<CompanyName | null>> {
	const parsed = parseCorporateAdministrationInput(
		findCompanyNameAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "findCompanyNameAsOf",
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
		},
	});
}
