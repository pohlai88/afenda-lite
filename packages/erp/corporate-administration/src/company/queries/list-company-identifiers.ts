import { fail, ok, type Result } from "@afenda/errors/result";
import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
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
	dependencies: CompanyIdentifierQueryDependencies,
): Promise<Result<CompanyIdentifierListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listCompanyIdentifiersInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.listCompanyIdentifiers,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const current = await dependencies.store.getLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail(
			"NOT_FOUND",
			"Corporate Administration legal company was not found.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_NOT_FOUND",
				{ entityType: "legalCompany" },
			),
		);
	}

	const identifiers = await dependencies.identifierStore.listCompanyIdentifiers(
		{
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
		},
	);
	if (!identifiers.ok) {
		return identifiers;
	}
	return ok({
		...identifiers.data,
		items: [...identifiers.data.items].sort(compareIdentifierListItems),
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
