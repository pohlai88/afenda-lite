import type { Result } from "@afenda/errors/result";
import type { z } from "zod";
import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { getLegalCompanyInputSchema } from "../schemas";
import type { LegalCompanyQueryDependencies } from "../store";
import type { LegalCompany } from "../types";

export type GetLegalCompanyInput = z.input<typeof getLegalCompanyInputSchema>;

export async function getLegalCompany(
	input: GetLegalCompanyInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: LegalCompanyQueryDependencies,
): Promise<Result<LegalCompany | null>> {
	const parsed = parseCorporateAdministrationInput(
		getLegalCompanyInputSchema,
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
			permission: CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.getLegalCompany,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return dependencies.store.getLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		knownAt: parsed.data.knownAt,
	});
}
