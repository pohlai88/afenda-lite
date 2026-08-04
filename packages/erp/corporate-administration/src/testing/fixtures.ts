import { errorResult } from "@afenda/errors";
import type { JurisdictionEntityTypeRule } from "../features/company/rules";
import type {
	CompanyPartyReferencePort,
	CompanyReferenceDataPort,
} from "../features/company/store";
import {
	correlationIdSchema,
	idempotencyKeySchema,
	organizationIdSchema,
	userIdSchema,
} from "../kernel/brands";

export const corporateAdministrationTestOrganizationId =
	organizationIdSchema.parse("org-ca-test");
export const corporateAdministrationTestActorUserId =
	userIdSchema.parse("user-ca-test");
export const corporateAdministrationTestCorrelationId =
	correlationIdSchema.parse("corr-ca-test");
export const corporateAdministrationTestIdempotencyKey =
	idempotencyKeySchema.parse("idem-ca-test");

export const corporateAdministrationJurisdictionRulesFixture = [
	{
		jurisdictionCountryCode: "MY",
		entityTypes: ["draft_legal_company", "private_limited_company"],
		active: true,
	},
] as const satisfies readonly JurisdictionEntityTypeRule[];

export function createCorporateAdministrationRuleFixturePort() {
	return {
		listEntityTypeRules: async () =>
			errorResult.ok(corporateAdministrationJurisdictionRulesFixture),
	};
}

export function createCorporateAdministrationPartyFixturePort(): CompanyPartyReferencePort {
	return {
		getOrganizationParty: async (input) =>
			errorResult.ok({
				partyId: input.partyId,
				kind: "organization",
				active: true,
			}),
	};
}

export function createCorporateAdministrationReferenceDataFixturePort(): CompanyReferenceDataPort {
	return {
		validateLanguage: async (input) =>
			errorResult.ok({ languageCode: input.languageCode, active: true }),
		resolveLanguage: async (input) =>
			errorResult.ok({ code: input.languageCode, active: true }),
		validateSourceDocument: async (input) =>
			errorResult.ok({
				sourceDocumentId: input.sourceDocumentId,
				active: true,
			}),
		resolveLegalForm: async (input) =>
			errorResult.ok({
				code: input.legalFormCode,
				active: true,
				jurisdictionCode: input.jurisdictionCode,
				legalFormCode: input.legalFormCode,
				effectiveDate: input.effectiveDate,
			}),
		validateLegalFormCompatibility: async () =>
			errorResult.ok({ compatible: true, active: true }),
		resolveCountry: async (input) =>
			errorResult.ok({
				code: input.countryCode,
				active: true,
				effectiveDate: input.effectiveDate,
			}),
		resolveCurrency: async (input) =>
			errorResult.ok({
				code: input.currencyCode,
				currencyCode: input.currencyCode,
				active: true,
				effectiveDate: input.effectiveDate,
			}),
		resolveIdentifierAuthority: async (input) =>
			errorResult.ok({
				code: input.authorityCode,
				active: true,
				jurisdictionCode: input.jurisdictionCode,
				authorityCode: input.authorityCode,
				effectiveDate: input.effectiveDate,
				uniquenessScope: "tenant_authority",
				caseSensitive: false,
				removePresentationSeparators: true,
			}),
		resolveActivityClassification: async (input) =>
			errorResult.ok({
				code: input.activityCode,
				active: true,
				classificationSystem: input.classificationSystem,
				activityCode: input.activityCode,
				effectiveDate: input.effectiveDate,
				activityType: "registered_object",
				requiresRegulator: false,
			}),
		resolveRegulator: async (input) =>
			errorResult.ok({
				code: input.regulatorCode,
				active: true,
				displayName: input.regulatorCode,
			}),
		resolveRegisteredActivity: async (input) =>
			errorResult.ok({ code: input.activityCode, active: true }),
		listLegalFormCompatibilityRules: async () =>
			errorResult.ok([
				{
					jurisdictionCode: "MY",
					legalFormCodes: ["private_limited_company"],
					entityTypeCodes: ["private_limited_company"],
					active: true,
				},
			]),
	};
}
