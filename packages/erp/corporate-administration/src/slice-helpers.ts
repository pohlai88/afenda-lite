import { fail, ok, type Result } from "@afenda/errors/result";

import type { CorporateAdministrationCommandOptions } from "./command-options";
import { resolveCommandDeps } from "./command-options";
import type { CorporateAdministrationMasterLookupPort } from "./ports";
import type { CaLegalCompany } from "./schemas";

export async function requireLegalCompany(
	options: CorporateAdministrationCommandOptions,
	organizationId: string,
	legalCompanyId: string,
): Promise<Result<CaLegalCompany>> {
	const { store } = resolveCommandDeps(options);
	const company = await store.getById(organizationId, legalCompanyId);
	if (!company.ok) return company;
	if (!company.data) {
		return fail("NOT_FOUND", "Legal company not found");
	}
	return ok(company.data);
}

export async function resolvePartySnapshot(
	masters: CorporateAdministrationMasterLookupPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		partyId: string;
	},
): Promise<
	Result<{ partyCodeSnapshot: string | null; partyNameSnapshot: string | null }>
> {
	if (!masters) {
		return fail("INTERNAL_ERROR", "Master lookup port is required");
	}
	const party = await masters.getPartyById(input);
	if (!party.ok) return party;
	if (!party.data) {
		return fail("NOT_FOUND", "Party not found");
	}
	return ok({
		partyCodeSnapshot: party.data.code,
		partyNameSnapshot: party.data.name,
	});
}

export function normalizeEntityCode(code: string): {
	code: string;
	normalizedCode: string;
} {
	const trimmed = code.trim();
	return {
		code: trimmed,
		normalizedCode: trimmed.normalize("NFC").trim().toUpperCase(),
	};
}
