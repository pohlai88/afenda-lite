import type { Result } from "@afenda/errors";
import type { z } from "zod";
import type { CorporateAdministrationQueryOptions } from "../../../kernel/execution/command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../../kernel/internal/query";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import { findCompanyJurisdictionProfileAsOfInputSchema } from "../schemas";
import type { LegalCompanyQueryDependencies } from "../store";
import type { CompanyJurisdictionProfile } from "../types";

export type FindCompanyJurisdictionProfileAsOfInput = z.input<
	typeof findCompanyJurisdictionProfileAsOfInputSchema
>;

export async function findCompanyJurisdictionProfileAsOf(
	input: FindCompanyJurisdictionProfileAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: LegalCompanyQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<CompanyJurisdictionProfile | null>> {
	const parsed = parseCorporateAdministrationInput(
		findCompanyJurisdictionProfileAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "findCompanyJurisdictionProfileAsOf",
		options,
		dependencies,
		work: async () =>
			dependencies.store.findJurisdictionProfileAsOf({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				asOf: parsed.data.asOf,
				knownAt: parsed.data.knownAt,
			}),
	});
}
