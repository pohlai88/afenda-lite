import { describe, expect, it } from "vitest";

import {
	addCompanyNameInputSchema,
	findCompanyNameAsOfInputSchema,
	listCompanyNamesInputSchema,
	retireCompanyNameInputSchema,
	supersedeCompanyNameInputSchema,
} from "../../src/features/company/index";

const legalCompanyId = "11111111-1111-4111-8111-111111111111";
const companyNameId = "22222222-2222-4222-8222-222222222222";

describe("company name contracts", () => {
	it("accepts intended command and query payloads", () => {
		expect(
			addCompanyNameInputSchema.safeParse({
				legalCompanyId,
				nameType: "legal",
				languageCode: "en",
				displayName: "Café Holdings",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:name:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(true);
		expect(
			supersedeCompanyNameInputSchema.safeParse({
				legalCompanyId,
				companyNameId,
				expectedNameVersion: 1,
				replacement: {
					nameType: "legal",
					languageCode: "en",
					displayName: "Café Holdings Berhad",
					effectiveFrom: "2025-05-01",
					effectiveTo: null,
					sourceDocumentId: "doc:name:2",
					correctionReason: "Registrar filing",
				},
			}).success,
		).toBe(true);
		expect(
			retireCompanyNameInputSchema.safeParse({
				legalCompanyId,
				companyNameId,
				retiredAt: "2026-01-01T00:00:00.000Z",
				retirementReason: "Trading name retired",
				expectedNameVersion: 1,
			}).success,
		).toBe(true);
		expect(
			listCompanyNamesInputSchema.safeParse({
				legalCompanyId,
				nameType: "translated",
				languageCode: "zh",
				activeAt: "2025-06-30",
				includeFormer: true,
				pageSize: 20,
			}).success,
		).toBe(true);
		expect(
			findCompanyNameAsOfInputSchema.safeParse({
				legalCompanyId,
				nameType: "legal",
				languageCode: "en",
				asOf: "2025-06-30",
				knownAt: new Date("2026-01-15T10:00:00.000Z"),
			}).success,
		).toBe(true);
	});

	it("keeps organization and actor stamping outside browser-controlled payloads", () => {
		expect(
			addCompanyNameInputSchema.safeParse({
				organizationId: "org-forged",
				actorUserId: "user-forged",
				legalCompanyId,
				nameType: "legal",
				languageCode: "en",
				displayName: "Café Holdings",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				expectedCompanyVersion: 1,
			}).success,
		).toBe(false);
	});
});
