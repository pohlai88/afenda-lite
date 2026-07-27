import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import type { CorporateAdministrationQueryOptions } from "../../src/command-options";
import {
	addCompanyNameInputSchema,
	type CompanyNameQueryDependencies,
	companyLegalFormSchema,
	companyNameSchema,
	findCompanyLegalFormAsOfInputSchema,
	findCompanyNameAsOfInputSchema,
	languageCodeSchema,
	legalCompanySchema,
	listCompanyNames,
	listCompanyNamesInputSchema,
	normalizeCompanyName,
	resolveCompanyLegalFormAsOf,
	resolveCompanyNameAsOf,
	setCompanyLegalFormInputSchema,
	supersedeCompanyNameInputSchema,
	validateCompanyNameEffectiveRange,
	validateCompanyNameLanguage,
	validateCompanyNameType,
	validateLegalFormCompatibility,
	validateLegalFormEffectiveRange,
} from "../../src/company";
import {
	correlationIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-name");
const legalCompanyId = legalCompanySchema.parse({
	organizationId,
	legalCompanyId: "11111111-1111-4111-8111-111111111111",
	companyCode: "AF-MY",
	normalizedCompanyCode: "AF-MY",
	masterDataPartyId: "party-1",
	homeJurisdictionCountryCode: "MY",
	state: "draft",
	profile: {
		displayName: "Afenda Malaysia",
		sourceReference: "doc:company:1",
	},
	currentJurisdictionProfile: null,
	createdByUserId: userIdSchema.parse("user-ca-name"),
	updatedByUserId: userIdSchema.parse("user-ca-name"),
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	version: 1,
}).legalCompanyId;
const actorUserId = userIdSchema.parse("user-ca-name");
const correlationId = correlationIdSchema.parse("corr-ca-name");

describe("company name and legal-form contracts", () => {
	it("accepts intended company-name command and query inputs", () => {
		expect(
			addCompanyNameInputSchema.safeParse({
				legalCompanyId,
				nameType: "legal",
				languageCode: "en-MY",
				displayName: "Afenda Malaysia Sdn Bhd",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:name:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(true);
		expect(
			supersedeCompanyNameInputSchema.safeParse({
				legalCompanyId,
				companyNameId: "22222222-2222-4222-8222-222222222222",
				expectedNameVersion: 1,
				replacement: {
					nameType: "legal",
					languageCode: "en-MY",
					displayName: "Afenda Malaysia Holdings Sdn Bhd",
					effectiveFrom: "2026-06-01",
					effectiveTo: null,
					sourceDocumentId: "doc:name:2",
					correctionReason: "Registrar correction",
				},
			}).success,
		).toBe(true);
		expect(
			listCompanyNamesInputSchema.safeParse({
				legalCompanyId,
				nameType: "translated",
				languageCode: "ms-MY",
				activeAt: "2026-07-27",
				includeFormer: true,
				cursor: "cursor-1",
				pageSize: 25,
				knownAt: new Date("2026-07-27T10:00:00.000Z"),
			}).success,
		).toBe(true);
		expect(
			findCompanyNameAsOfInputSchema.safeParse({
				legalCompanyId,
				nameType: "legal",
				languageCode: "en-MY",
				asOf: "2026-07-27",
			}).success,
		).toBe(true);
	});

	it("passes list-company-name filters with deterministic ordering after tenant validation", async () => {
		const legalCompany = legalCompanySchema.parse({
			organizationId,
			legalCompanyId,
			companyCode: "AF-MY",
			normalizedCompanyCode: "AF-MY",
			masterDataPartyId: "party-1",
			homeJurisdictionCountryCode: "MY",
			state: "draft",
			profile: {
				displayName: "Afenda Malaysia",
				sourceReference: "doc:company:1",
			},
			currentJurisdictionProfile: null,
			createdByUserId: actorUserId,
			updatedByUserId: actorUserId,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
			version: 1,
		});
		let observedInput: unknown;
		const options: CorporateAdministrationQueryOptions = {
			organizationId,
			actorUserId,
			correlationId,
			authorization: { can: async () => true },
		};
		const dependencies = {
			store: {
				getLegalCompany: async () => ok(legalCompany),
			},
			nameStore: {
				listCompanyNames: async (input: unknown) => {
					observedInput = input;
					return ok([]);
				},
			},
		} as unknown as CompanyNameQueryDependencies;

		const result = await listCompanyNames(
			{
				legalCompanyId,
				nameType: "legal",
				languageCode: "en-MY",
				activeAt: "2025-06-30",
				includeFormer: true,
				cursor: "cursor-1",
				pageSize: 25,
				knownAt: new Date("2026-01-15T10:00:00.000Z"),
			},
			options,
			dependencies,
		);

		expect(result.ok).toBe(true);
		expect(observedInput).toEqual({
			organizationId,
			legalCompanyId,
			nameType: "legal",
			languageCode: "en-MY",
			activeAt: "2025-06-30",
			includeFormer: true,
			cursor: "cursor-1",
			pageSize: 25,
			knownAt: "2026-01-15T10:00:00.000Z",
			ordering: "name_type_language_effective_from_desc_recorded_at_desc_id",
		});
	});

	it("requires valid language code and closed name type", () => {
		expect(languageCodeSchema.safeParse("english").success).toBe(false);
		expect(validateCompanyNameLanguage("en-MY").ok).toBe(true);
		expect(validateCompanyNameLanguage("english").ok).toBe(false);
		expect(validateCompanyNameType("trading").ok).toBe(true);
		expect(validateCompanyNameType("nickname").ok).toBe(false);
		expect(
			addCompanyNameInputSchema.safeParse({
				legalCompanyId,
				nameType: "nickname",
				languageCode: "en",
				displayName: "Afenda",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:name:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(false);
	});

	it("normalizes company names without altering display spelling", () => {
		expect(normalizeCompanyName("  DE\u0301   LETTUCE BEAR BERHAD  ")).toBe(
			"dé lettuce bear berhad",
		);
		expect(normalizeCompanyName("DÉ LETTUCE BEAR BERHAD")).toBe(
			"dé lettuce bear berhad",
		);
		expect(() => normalizeCompanyName("   ")).toThrow(RangeError);
	});

	it("prevents company-name overlap by name type and language only", () => {
		const existing = [
			companyNameSchema.parse({
				id: "22222222-2222-4222-8222-222222222222",
				organizationId,
				legalCompanyId,
				nameType: "legal",
				languageCode: "en-MY",
				displayName: "Afenda Malaysia",
				normalizedName: "afenda malaysia",
				effectiveFrom: "2026-01-01",
				effectiveTo: "2026-12-31",
				recordedAt: new Date("2026-07-27T00:00:00.000Z"),
				recordedBy: actorUserId,
				sourceDocumentId: "doc:name:1",
				correctionReason: null,
				status: "active",
				supersedesId: null,
				supersededAt: null,
				retiredAt: null,
				version: 1,
			}),
		];

		expect(
			validateCompanyNameEffectiveRange({
				candidate: { from: "2026-06-01", to: null },
				nameType: "legal",
				languageCode: "en-MY",
				normalizedName: "afenda malaysia",
				existing,
			}).ok,
		).toBe(false);
		expect(
			validateCompanyNameEffectiveRange({
				candidate: { from: "2026-06-01", to: null },
				nameType: "trading",
				languageCode: "en-MY",
				normalizedName: "afenda malaysia",
				existing,
			}).ok,
		).toBe(true);
		expect(
			validateCompanyNameEffectiveRange({
				candidate: { from: "2026-06-01", to: null },
				nameType: "legal",
				languageCode: "ms-MY",
				normalizedName: "afenda malaysia",
				existing,
			}).ok,
		).toBe(true);
		expect(
			validateCompanyNameEffectiveRange({
				candidate: { from: "2027-01-01", to: null },
				nameType: "legal",
				languageCode: "en-MY",
				normalizedName: "afenda malaysia",
				existing,
			}).ok,
		).toBe(true);
		expect(
			resolveCompanyNameAsOf({
				names: existing,
				nameType: "legal",
				languageCode: "en-MY",
				asOf: "2026-06-01",
			})?.id,
		).toBe("22222222-2222-4222-8222-222222222222");
	});

	it("accepts legal-form command/query inputs and rejects overlap", () => {
		expect(
			setCompanyLegalFormInputSchema.safeParse({
				legalCompanyId,
				legalFormCode: "private_limited_company",
				jurisdictionCode: "MY",
				entityTypeCode: "company",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:form:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(true);
		expect(
			findCompanyLegalFormAsOfInputSchema.safeParse({
				legalCompanyId,
				jurisdictionCode: "MY",
				asOf: "2026-07-27",
			}).success,
		).toBe(true);

		const existing = [
			companyLegalFormSchema.parse({
				id: "33333333-3333-4333-8333-333333333333",
				organizationId,
				legalCompanyId,
				jurisdictionCode: "MY",
				legalFormCode: "private_limited_company",
				entityTypeCode: "company",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				recordedAt: new Date("2026-07-27T00:00:00.000Z"),
				recordedBy: actorUserId,
				sourceDocumentId: "doc:form:1",
				correctionReason: null,
				status: "active",
				supersedesId: null,
				supersededAt: null,
				version: 1,
			}),
		];

		expect(
			validateLegalFormEffectiveRange({
				candidate: { from: "2026-06-01", to: null },
				existing,
			}).ok,
		).toBe(false);
		expect(
			validateLegalFormEffectiveRange({
				candidate: { from: "2027-01-01", to: null },
				existing: [
					{
						...existing[0],
						effectiveTo: "2026-12-31",
					},
				],
			}).ok,
		).toBe(true);
		expect(
			validateLegalFormCompatibility({
				jurisdictionCode: "MY",
				legalFormCode: "private_limited_company",
				entityTypeCode: "company",
				rules: [
					{
						jurisdictionCode: "MY",
						legalFormCodes: ["private_limited_company"],
						entityTypeCodes: ["company"],
						active: true,
					},
				],
			}).ok,
		).toBe(true);
		expect(
			resolveCompanyLegalFormAsOf({
				legalForms: existing,
				asOf: "2026-06-01",
			})?.id,
		).toBe("33333333-3333-4333-8333-333333333333");
	});
});
