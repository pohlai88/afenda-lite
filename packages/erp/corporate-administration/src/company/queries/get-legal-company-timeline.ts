import type { Result } from "@afenda/errors";
import type { z } from "zod";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
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
	dependencies: LegalCompanyQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<readonly LegalCompanyTimelineEntry[]>> {
	const parsed = parseCorporateAdministrationInput(
		getLegalCompanyTimelineInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "getLegalCompanyTimeline",
		options,
		dependencies,
		work: async () =>
			dependencies.store.getLegalCompanyTimeline({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				knownAt: parsed.data.knownAt,
			}),
	});
}
