import {
	findCompanyJurisdictionProfileAsOfInputSchema,
	getLegalCompanyInputSchema,
	getLegalCompanyTimelineInputSchema,
	legalCompanyListPageSchema,
	legalCompanySchema,
	legalCompanyTimelineEntrySchema,
	listLegalCompaniesInputSchema,
	setCompanyJurisdictionProfileInputSchema,
	supersedeCompanyJurisdictionProfileInputSchema,
	updateLegalCompanyProfileInputSchema,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import {
	caJurisdictionProfileInput,
	caSupersedeInput,
} from "../helpers/legal-company-test-kit";

const legalCompanyId = "018f4ace-5986-73a2-9c4d-111111111111";
const jurisdictionProfileId = "018f4ace-5986-73a2-9c4d-222222222222";

describe("Corporate Administration company input and output contracts", () => {
	it("accepts the intended CA-1.1 command inputs", () => {
		expect(
			updateLegalCompanyProfileInputSchema.safeParse({
				legalCompanyId,
				expectedVersion: 2,
				profile: {
					displayName: "Afenda Malaysia",
					registeredName: "Afenda Malaysia Sdn Bhd",
					sourceReference: "board-resolution-1",
				},
			}).success,
		).toBe(true);
		expect(
			setCompanyJurisdictionProfileInputSchema.safeParse(
				caJurisdictionProfileInput({
					legalCompanyId,
					expectedCompanyVersion: 2,
				}),
			).success,
		).toBe(true);
		expect(
			supersedeCompanyJurisdictionProfileInputSchema.safeParse(
				caSupersedeInput({
					legalCompanyId,
					jurisdictionProfileId,
					expectedProfileVersion: 1,
				}),
			).success,
		).toBe(true);
	});

	it("keeps organizationId and actorUserId out of browser-controlled command payloads", () => {
		const unsafePayload = {
			...caJurisdictionProfileInput({
				legalCompanyId,
				expectedCompanyVersion: 2,
			}),
			organizationId: "org-forged",
			actorUserId: "user-forged",
		};

		expect(
			setCompanyJurisdictionProfileInputSchema.safeParse(unsafePayload).success,
		).toBe(false);
	});

	it("exposes stable output contracts for all four CA-1.1 queries", () => {
		const company = {
			organizationId: "org-contract",
			legalCompanyId,
			companyCode: "AF-MY",
			normalizedCompanyCode: "AF-MY",
			masterDataPartyId: "party-1",
			homeJurisdictionCountryCode: "MY",
			state: "draft",
			profile: {
				displayName: "Afenda Malaysia",
				sourceReference: "board-resolution-1",
			},
			currentJurisdictionProfile: null,
			createdByUserId: "user-contract",
			updatedByUserId: "user-contract",
			createdAt: "2026-07-26T10:00:00.000Z",
			updatedAt: "2026-07-26T10:00:00.000Z",
			version: 1,
		};

		expect(legalCompanySchema.safeParse(company).success).toBe(true);
		expect(
			legalCompanyListPageSchema.safeParse({
				items: [
					{
						organizationId: company.organizationId,
						legalCompanyId: company.legalCompanyId,
						companyCode: company.companyCode,
						normalizedCompanyCode: company.normalizedCompanyCode,
						masterDataPartyId: company.masterDataPartyId,
						homeJurisdictionCountryCode: company.homeJurisdictionCountryCode,
						state: company.state,
						profile: company.profile,
						version: company.version,
						jurisdictionCountryCode: null,
						entityType: null,
					},
				],
				nextCursor: null,
			}).success,
		).toBe(true);
		expect(
			legalCompanyTimelineEntrySchema.safeParse({
				kind: "profile",
				legalCompanyId,
				recordedAt: "2026-07-26T10:00:00.000Z",
				version: 1,
				profile: company.profile,
			}).success,
		).toBe(true);
	});

	it("accepts the intended CA-1.1 query inputs", () => {
		expect(
			getLegalCompanyInputSchema.safeParse({ legalCompanyId }).success,
		).toBe(true);
		expect(listLegalCompaniesInputSchema.safeParse({}).success).toBe(true);
		expect(
			findCompanyJurisdictionProfileAsOfInputSchema.safeParse({
				legalCompanyId,
				asOf: "2026-07-26",
			}).success,
		).toBe(true);
		expect(
			getLegalCompanyTimelineInputSchema.safeParse({ legalCompanyId }).success,
		).toBe(true);
	});

	it("fails invalid effective dates at the contract boundary", () => {
		expect(
			setCompanyJurisdictionProfileInputSchema.safeParse(
				caJurisdictionProfileInput({
					legalCompanyId,
					expectedCompanyVersion: 2,
					from: "2026-13-01",
				}),
			).success,
		).toBe(false);
		expect(
			setCompanyJurisdictionProfileInputSchema.safeParse(
				caJurisdictionProfileInput({
					legalCompanyId,
					expectedCompanyVersion: 2,
					recordedAt: "not-an-instant",
				}),
			).success,
		).toBe(false);
	});
});
