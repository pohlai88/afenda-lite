import { errorResult, type Result } from "@afenda/errors";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { findCompanyLegalFormAsOfInputSchema } from "../schemas";
import type { CompanyLegalFormQueryDependencies } from "../store";
import type { CompanyLegalForm, FindCompanyLegalFormAsOfInput } from "../types";

export async function findCompanyLegalFormAsOf(
	input: FindCompanyLegalFormAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyLegalFormQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<CompanyLegalForm | null>> {
	const parsed = parseCorporateAdministrationInput(
		findCompanyLegalFormAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "findCompanyLegalFormAsOf",
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

			return dependencies.legalFormStore.findCompanyLegalFormAsOf({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				jurisdictionCode: parsed.data.jurisdictionCode,
				asOf: parsed.data.asOf,
				knownAt:
					parsed.data.knownAt === undefined
						? undefined
						: toCanonicalInstant(parsed.data.knownAt),
			});
		},
	});
}
