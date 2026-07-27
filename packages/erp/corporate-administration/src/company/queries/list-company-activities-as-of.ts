import { fail, ok, type Result } from "@afenda/errors/result";
import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { listCompanyActivitiesAsOfInputSchema } from "../schemas";
import type { CompanyActivityQueryDependencies } from "../store";
import type { CompanyActivity, ListCompanyActivitiesAsOfInput } from "../types";

export async function listCompanyActivitiesAsOf(
	input: ListCompanyActivitiesAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: CompanyActivityQueryDependencies,
): Promise<Result<readonly CompanyActivity[]>> {
	const parsed = parseCorporateAdministrationInput(
		listCompanyActivitiesAsOfInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS.listCompanyActivitiesAsOf,
		},
	);
	if (!authorized.ok) return authorized;

	const current = await dependencies.store.getLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
	});
	if (!current.ok) return current;
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

	const activities = await dependencies.activityStore.listCompanyActivitiesAsOf(
		{
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			classification: parsed.data.classification ?? parsed.data.activityType,
			classificationSystem: parsed.data.classificationSystem,
			jurisdictionCode: parsed.data.jurisdictionCode,
			regulatorCode: parsed.data.regulatorCode,
			primaryOnly: parsed.data.primaryOnly,
			asOf: parsed.data.asOf,
			knownAt:
				parsed.data.knownAt === undefined
					? undefined
					: toCanonicalInstant(parsed.data.knownAt),
		},
	);
	if (!activities.ok) return activities;
	return ok([...activities.data].sort(compareCompanyActivities));
}

function compareCompanyActivities(
	left: CompanyActivity,
	right: CompanyActivity,
): number {
	return (
		left.classification.localeCompare(right.classification) ||
		left.activityCode.localeCompare(right.activityCode) ||
		left.effectiveFrom.localeCompare(right.effectiveFrom) ||
		left.id.localeCompare(right.id)
	);
}
