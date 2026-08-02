import { errorResult, type Result } from "@afenda/errors";
import { toCanonicalInstant } from "../../../kernel/dates";
import type { CorporateAdministrationQueryOptions } from "../../../kernel/execution/command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../../kernel/internal/query";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import { listCompanyIdentifiersInputSchema } from "../schemas";
import type { CompanyIdentifierQueryDependencies } from "../store";
import type {
	CompanyIdentifierListItem,
	CompanyIdentifierListPage,
	ListCompanyIdentifiersInput,
} from "../types";

export async function listCompanyIdentifiers(
	input: ListCompanyIdentifiersInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyIdentifierQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<CompanyIdentifierListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listCompanyIdentifiersInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "listCompanyIdentifiers",
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

			const identifiers =
				await dependencies.identifierStore.listCompanyIdentifiers({
					organizationId: options.organizationId,
					legalCompanyId: parsed.data.legalCompanyId,
					identifierType: parsed.data.identifierType,
					jurisdictionCode: parsed.data.jurisdictionCode,
					issuingAuthorityCode:
						parsed.data.issuingAuthorityCode ?? parsed.data.authorityCode,
					activeAt: parsed.data.activeAt,
					includeRetired: parsed.data.includeRetired ?? false,
					cursor: parsed.data.cursor,
					pageSize: parsed.data.pageSize,
					knownAt:
						parsed.data.knownAt === undefined
							? undefined
							: toCanonicalInstant(parsed.data.knownAt),
				});
			if (!identifiers.ok) {
				return identifiers;
			}
			return errorResult.ok({
				...identifiers.data,
				items: [...identifiers.data.items].sort(compareIdentifierListItems),
			});
		},
	});
}

function compareIdentifierListItems(
	left: CompanyIdentifierListItem,
	right: CompanyIdentifierListItem,
): number {
	return (
		left.identifierType.localeCompare(right.identifierType) ||
		left.jurisdictionCode.localeCompare(right.jurisdictionCode) ||
		left.issuingAuthorityCode.localeCompare(right.issuingAuthorityCode) ||
		right.effectiveFrom.localeCompare(left.effectiveFrom) ||
		right.recordedAt.getTime() - left.recordedAt.getTime() ||
		left.id.localeCompare(right.id)
	);
}
