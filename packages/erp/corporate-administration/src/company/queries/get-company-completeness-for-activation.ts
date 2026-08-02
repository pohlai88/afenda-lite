import { errorResult, type Result } from "@afenda/errors";

import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { getCompanyCompletenessForActivationInputSchema } from "../schemas";
import type { LegalCompanyLifecycleQueryDependencies } from "../store";
import type {
	CompanyActivationCompleteness,
	GetCompanyCompletenessForActivationInput,
} from "../types";

export async function getCompanyCompletenessForActivation(
	input: GetCompanyCompletenessForActivationInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: LegalCompanyLifecycleQueryDependencies &
		CorporateAdministrationQueryKernelDependencies,
): Promise<Result<CompanyActivationCompleteness>> {
	const parsed = parseCorporateAdministrationInput(
		getCompanyCompletenessForActivationInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	return await executeCorporateAdministrationQuery({
		operationId: "getCompanyCompletenessForActivation",
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

			const knownAt =
				parsed.data.knownAt === undefined
					? undefined
					: toCanonicalInstant(parsed.data.knownAt);
			const jurisdiction = await dependencies.store.findJurisdictionProfileAsOf(
				{
					organizationId: options.organizationId,
					legalCompanyId: parsed.data.legalCompanyId,
					asOf: parsed.data.asOf,
					knownAt,
				},
			);
			if (!jurisdiction.ok) {
				return jurisdiction;
			}
			const name = await dependencies.nameStore.findCompanyNameAsOf({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				nameType: "legal",
				languageCode: "en",
				asOf: parsed.data.asOf,
				knownAt,
			});
			if (!name.ok) {
				return name;
			}
			const legalForm =
				await dependencies.legalFormStore.findCompanyLegalFormAsOf({
					organizationId: options.organizationId,
					legalCompanyId: parsed.data.legalCompanyId,
					asOf: parsed.data.asOf,
					knownAt,
				});
			if (!legalForm.ok) {
				return legalForm;
			}
			const identifier =
				await dependencies.identifierStore.findCompanyIdentifierAsOf({
					organizationId: options.organizationId,
					legalCompanyId: parsed.data.legalCompanyId,
					identifierType: "company_registration",
					asOf: parsed.data.asOf,
					knownAt,
				});
			if (!identifier.ok) {
				return identifier;
			}
			const financialYear =
				await dependencies.financialYearStore.findCompanyFinancialYearAsOf({
					organizationId: options.organizationId,
					legalCompanyId: parsed.data.legalCompanyId,
					asOf: parsed.data.asOf,
					knownAt,
				});
			if (!financialYear.ok) {
				return financialYear;
			}
			const activities =
				await dependencies.activityStore.listCompanyActivitiesAsOf({
					organizationId: options.organizationId,
					legalCompanyId: parsed.data.legalCompanyId,
					asOf: parsed.data.asOf,
					knownAt,
				});
			if (!activities.ok) {
				return activities;
			}
			const registeredAddress =
				await dependencies.establishmentStore.findRegisteredAddressAsOf({
					organizationId: options.organizationId,
					legalCompanyId: parsed.data.legalCompanyId,
					legalEstablishmentId: null,
					addressType: "registered_office",
					asOf: parsed.data.asOf,
					knownAt,
				});
			if (!registeredAddress.ok) {
				return registeredAddress;
			}
			const checks = {
				hasJurisdictionProfile: jurisdiction.data !== null,
				hasLegalName: name.data !== null,
				hasLegalForm: legalForm.data !== null,
				hasCompanyIdentifier: identifier.data !== null,
				hasFinancialYear: financialYear.data !== null,
				hasRegisteredActivity: activities.data.length > 0,
				hasRegisteredAddress: registeredAddress.data !== null,
			} as const;

			const missing = Object.entries(checks)
				.filter(([, present]) => !present)
				.map(([field]) => field);

			return errorResult.ok({
				legalCompanyId: parsed.data.legalCompanyId,
				...checks,
				complete: missing.length === 0,
				missing,
			});
		},
	});
}
