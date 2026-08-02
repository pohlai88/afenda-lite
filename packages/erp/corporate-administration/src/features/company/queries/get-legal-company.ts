import type { Result } from "@afenda/errors";
import type { z } from "zod";
import type { CorporateAdministrationQueryOptions } from "../../../kernel/execution/command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../../kernel/internal/query";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import { getLegalCompanyInputSchema } from "../schemas";
import type { LegalCompanyQueryDependencies } from "../store";
import type { LegalCompany } from "../types";

export type GetLegalCompanyInput = z.input<typeof getLegalCompanyInputSchema>;

export async function getLegalCompany(
	input: GetLegalCompanyInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: LegalCompanyQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<LegalCompany | null>> {
	const parsed = parseCorporateAdministrationInput(
		getLegalCompanyInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "getLegalCompany",
		options,
		dependencies,
		work: async () =>
			dependencies.store.getLegalCompany({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				knownAt: parsed.data.knownAt,
			}),
	});
}
