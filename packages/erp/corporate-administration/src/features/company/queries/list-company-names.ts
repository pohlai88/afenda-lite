import { errorResult, type Result } from "@afenda/errors";
import { toCanonicalInstant } from "../../../kernel/dates";
import type { CorporateAdministrationQueryOptions } from "../../../kernel/execution/command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../../kernel/internal/query";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import { listCompanyNamesInputSchema } from "../schemas";
import type {
	CompanyNameListPage,
	CompanyNameQueryDependencies,
} from "../store";
import type { ListCompanyNamesInput } from "../types";

export async function listCompanyNames(
	input: ListCompanyNamesInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyNameQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<CompanyNameListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listCompanyNamesInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "listCompanyNames",
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

			return dependencies.nameStore.listCompanyNames({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				nameType: parsed.data.nameType,
				languageCode: parsed.data.languageCode,
				activeAt: parsed.data.activeAt,
				includeFormer: parsed.data.includeFormer ?? false,
				cursor: parsed.data.cursor,
				pageSize: parsed.data.pageSize,
				knownAt:
					parsed.data.knownAt === undefined
						? undefined
						: toCanonicalInstant(parsed.data.knownAt),
				ordering: "name_type_language_effective_from_desc_recorded_at_desc_id",
			});
		},
	});
}
