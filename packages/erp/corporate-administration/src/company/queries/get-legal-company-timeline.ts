import type { Result } from "@afenda/errors/result";
import type { z } from "zod";
import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { getLegalCompanyTimelineInputSchema } from "../schemas";
import type { LegalCompanyQueryDependencies } from "../store";
import type { LegalCompanyTimelineEntry } from "../types";

export type GetLegalCompanyTimelineInput = z.input<
	typeof getLegalCompanyTimelineInputSchema
>;

export async function getLegalCompanyTimeline(
	input: GetLegalCompanyTimelineInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: LegalCompanyQueryDependencies,
): Promise<Result<readonly LegalCompanyTimelineEntry[]>> {
	const parsed = parseCorporateAdministrationInput(
		getLegalCompanyTimelineInputSchema,
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
				CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.getLegalCompanyTimeline,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return dependencies.store.getLegalCompanyTimeline({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		knownAt: parsed.data.knownAt,
	});
}
