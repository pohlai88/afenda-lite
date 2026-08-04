import { errorResult, type Result } from "@afenda/errors";

import type { CorporateAdministrationQueryOptions } from "../../../kernel/execution/command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../../kernel/internal/query";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import {
	getAuthorityMandateInputSchema,
	listAuthorityMandatesAsOfInputSchema,
} from "../schemas";
import type { AuthorityQueryDependencies } from "../store";
import type {
	AuthorityMandate,
	AuthorityMandateListPage,
	GetAuthorityMandateInput,
	ListAuthorityMandatesAsOfInput,
} from "../types";

type Dependencies = AuthorityQueryDependencies &
	CorporateAdministrationQueryKernelDependencies;

export async function listAuthorityMandatesAsOf(
	input: ListAuthorityMandatesAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<AuthorityMandateListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listAuthorityMandatesAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listAuthorityMandatesAsOf",
		options,
		dependencies,
		work: () =>
			dependencies.authorityStore.listAuthorityMandatesAsOf({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				asOf: parsed.data.asOf,
				mandateType: parsed.data.mandateType,
				holderPartyId: parsed.data.holderPartyId,
				cursor: parsed.data.cursor,
				pageSize: parsed.data.pageSize,
			}),
	});
}

export async function getAuthorityMandate(
	input: GetAuthorityMandateInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<AuthorityMandate>> {
	const parsed = parseCorporateAdministrationInput(
		getAuthorityMandateInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "getAuthorityMandate",
		options,
		dependencies,
		work: async () => {
			const result = await dependencies.authorityStore.getAuthorityMandate({
				organizationId: options.organizationId,
				authorityMandateId: parsed.data.authorityMandateId,
			});
			if (!result.ok) {
				return result;
			}
			return result.data === null
				? notFound("authorityMandate")
				: errorResult.ok(result.data);
		},
	});
}

function notFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}
