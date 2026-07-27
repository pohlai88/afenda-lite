import {
	assertEffectivePeriodChronology,
	assertJurisdictionEntityTypeCompatible,
	assertNoJurisdictionProfileOverlap,
	assertSupersessionEligible,
	type CompanyJurisdictionProfile,
	isFutureDatedProfile,
	isRetroactiveCorrection,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";

const baseProfile = {
	jurisdictionProfileId: "018f4ace-5986-73a2-9c4d-111111111111",
	organizationId: "org-rules",
	legalCompanyId: "018f4ace-5986-73a2-9c4d-222222222222",
	jurisdictionCountryCode: "MY",
	entityType: "private_limited_company",
	effectiveRange: { from: "2026-01-01", to: "2026-12-31" },
	recordedAt: "2026-01-02T00:00:00.000Z",
	recordedByUserId: "user-rules",
	sourceReference: "rules-test",
	supersededAt: null,
	supersededByProfileId: null,
	version: 1,
} satisfies CompanyJurisdictionProfile;

describe("Corporate Administration jurisdiction profile rules", () => {
	it("accepts compatible jurisdiction and entity type rules", () => {
		const result = assertJurisdictionEntityTypeCompatible({
			jurisdictionCountryCode: "MY",
			entityType: "private_limited_company",
			rules: [
				{
					jurisdictionCountryCode: "MY",
					entityTypes: ["private_limited_company"],
					active: true,
				},
			],
		});

		expect(result.ok).toBe(true);
	});

	it("rejects an invalid jurisdiction and entity type combination", () => {
		const result = assertJurisdictionEntityTypeCompatible({
			jurisdictionCountryCode: "MY",
			entityType: "public_limited_company",
			rules: [
				{
					jurisdictionCountryCode: "MY",
					entityTypes: ["private_limited_company"],
					active: true,
				},
			],
		});

		expect(result).toMatchObject({
			ok: false,
			code: "VALIDATION_ERROR",
			details: { reason: "CORPORATE_ADMINISTRATION_REFERENCE_INVALID" },
		});
	});

	it("rejects inactive reference rules", () => {
		const result = assertJurisdictionEntityTypeCompatible({
			jurisdictionCountryCode: "MY",
			entityType: "private_limited_company",
			rules: [
				{
					jurisdictionCountryCode: "MY",
					entityTypes: ["private_limited_company"],
					active: false,
				},
			],
		});

		expect(result).toMatchObject({
			ok: false,
			code: "CONFLICT",
			details: { reason: "CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE" },
		});
	});

	it("rejects an effective end date before or equal to the start date", () => {
		expect(
			assertEffectivePeriodChronology({
				from: "2026-02-01",
				to: "2026-01-31",
			}),
		).toMatchObject({
			ok: false,
			code: "CONFLICT",
			details: { reason: "CORPORATE_ADMINISTRATION_CHRONOLOGY_INVALID" },
		});
		expect(
			assertEffectivePeriodChronology({
				from: "2026-02-01",
				to: "2026-02-01",
			}),
		).toMatchObject({
			ok: false,
			code: "CONFLICT",
			details: { reason: "CORPORATE_ADMINISTRATION_CHRONOLOGY_INVALID" },
		});
	});

	it("rejects overlapping active profiles", () => {
		const result = assertNoJurisdictionProfileOverlap({
			candidate: { from: "2026-06-01", to: null },
			existing: [baseProfile],
		});

		expect(result).toMatchObject({
			ok: false,
			code: "CONFLICT",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});
	});

	it("rejects supersession of a predecessor not found for the selected company", () => {
		const result = assertSupersessionEligible({
			profile: null,
			expectedVersion: 1,
		});

		expect(result).toMatchObject({
			ok: false,
			code: "NOT_FOUND",
			details: { reason: "CORPORATE_ADMINISTRATION_NOT_FOUND" },
		});
	});

	it("classifies future-dated and retroactive profile facts", () => {
		expect(
			isFutureDatedProfile({
				profile: baseProfile,
				today: "2025-12-31",
			}),
		).toBe(true);
		expect(
			isRetroactiveCorrection({
				effectiveRange: baseProfile.effectiveRange,
				today: "2026-06-01",
			}),
		).toBe(true);
	});
});
