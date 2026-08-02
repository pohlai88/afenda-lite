import { errorResult, type Result } from "@afenda/errors";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { findCompanyIdentifierAsOfInputSchema } from "../schemas";
import type { CompanyIdentifierQueryDependencies } from "../store";
import type {
	CompanyIdentifier,
	FindCompanyIdentifierAsOfInput,
} from "../types";

export async function findCompanyIdentifierAsOf(
	input: FindCompanyIdentifierAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyIdentifierQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<CompanyIdentifier | null>> {
	const parsed = parseCorporateAdministrationInput(
		findCompanyIdentifierAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "findCompanyIdentifierAsOf",
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

			return dependencies.identifierStore.findCompanyIdentifierAsOf({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				identifierType: parsed.data.identifierType,
				jurisdictionCode: parsed.data.jurisdictionCode,
				issuingAuthorityCode:
					parsed.data.issuingAuthorityCode ?? parsed.data.authorityCode,
				asOf: parsed.data.asOf,
				knownAt:
					parsed.data.knownAt === undefined
						? undefined
						: toCanonicalInstant(parsed.data.knownAt),
			});
		},
	});
}
