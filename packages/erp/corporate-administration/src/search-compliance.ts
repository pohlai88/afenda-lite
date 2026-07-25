import { fail, type Result } from "@afenda/errors/result";

import { requireCaQueryPermission } from "./authorization";
import {
	type CorporateAdministrationCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	CA_QUERY_CORPORATE_RECORDS_SEARCH,
	CA_QUERY_FILING_DUE_LIST,
	CA_QUERY_FILING_OVERDUE_LIST,
} from "./module-ids";
import type {
	CaCorporateRecordSearchHit,
	CaFilingObligation,
} from "./slice-types";
import {
	listDueFilingsInputSchema,
	listOverdueFilingsInputSchema,
	searchCorporateRecordsInputSchema,
} from "./slice-types";

export async function listDueFilings(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaFilingObligation[]>> {
	const parsed = listDueFilingsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid due filings list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_FILING_DUE_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listDueFilings(
		parsed.data.organizationId,
		parsed.data.asOf,
		parsed.data.legalCompanyId,
	);
}

export async function listOverdueFilings(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaFilingObligation[]>> {
	const parsed = listOverdueFilingsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid overdue filings list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_FILING_OVERDUE_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listOverdueFilings(
		parsed.data.organizationId,
		parsed.data.asOf,
		parsed.data.legalCompanyId,
	);
}

export async function searchCorporateRecords(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCorporateRecordSearchHit[]>> {
	const parsed = searchCorporateRecordsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid corporate records search input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_CORPORATE_RECORDS_SEARCH,
	});
	if (!authorized.ok) return authorized;
	return store.searchCorporateRecords(
		parsed.data.organizationId,
		parsed.data.query,
		parsed.data.limit,
		parsed.data.legalCompanyId,
	);
}
