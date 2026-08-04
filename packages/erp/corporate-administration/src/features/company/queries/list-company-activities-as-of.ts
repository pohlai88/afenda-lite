import { errorResult, type Result } from "@afenda/errors";
import { toCanonicalInstant } from "../../../kernel/dates";
import type { CorporateAdministrationQueryOptions } from "../../../kernel/execution/command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../../kernel/internal/query";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import { listCompanyActivitiesAsOfInputSchema } from "../schemas";
import type { CompanyActivityQueryDependencies } from "../store";
import type {
	CompanyActivityListItem,
	CompanyActivityListPage,
	ListCompanyActivitiesAsOfInput,
} from "../types";

export async function listCompanyActivitiesAsOf(
	input: ListCompanyActivitiesAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyActivityQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<CompanyActivityListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listCompanyActivitiesAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "listCompanyActivitiesAsOf",
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

			const activities =
				await dependencies.activityStore.listCompanyActivitiesAsOf({
					organizationId: options.organizationId,
					legalCompanyId: parsed.data.legalCompanyId,
					classification:
						parsed.data.classification ?? parsed.data.activityType,
					classificationSystem: parsed.data.classificationSystem,
					jurisdictionCode: parsed.data.jurisdictionCode,
					regulatorCode: parsed.data.regulatorCode,
					primaryOnly: parsed.data.primaryOnly,
					cursor: parsed.data.cursor,
					pageSize: parsed.data.pageSize,
					asOf: parsed.data.asOf,
					knownAt:
						parsed.data.knownAt === undefined
							? undefined
							: toCanonicalInstant(parsed.data.knownAt),
				});
			if (!activities.ok) {
				return activities;
			}
			return errorResult.ok({
				...activities.data,
				items: [...activities.data.items].sort(compareCompanyActivities),
			});
		},
	});
}

function compareCompanyActivities(
	left: CompanyActivityListItem,
	right: CompanyActivityListItem,
): number {
	return (
		left.classification.localeCompare(right.classification) ||
		left.activityCode.localeCompare(right.activityCode) ||
		left.effectiveFrom.localeCompare(right.effectiveFrom) ||
		left.id.localeCompare(right.id)
	);
}
