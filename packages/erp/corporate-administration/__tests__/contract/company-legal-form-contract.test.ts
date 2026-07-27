import { describe, expect, it } from "vitest";

import {
	findCompanyLegalFormAsOfInputSchema,
	setCompanyLegalFormInputSchema,
	supersedeCompanyLegalFormInputSchema,
} from "../../src/company";

const legalCompanyId = "11111111-1111-4111-8111-111111111111";
const companyLegalFormHistoryId = "33333333-3333-4333-8333-333333333333";

describe("company legal-form contracts", () => {
	it("accepts intended command and query payloads", () => {
		expect(
			setCompanyLegalFormInputSchema.safeParse({
				legalCompanyId,
				legalFormCode: "private_limited_company",
				jurisdictionCode: "MY",
				entityTypeCode: "private_limited_company",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:legal-form:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(true);
		expect(
			supersedeCompanyLegalFormInputSchema.safeParse({
				legalCompanyId,
				companyLegalFormHistoryId,
				expectedLegalFormVersion: 1,
				replacement: {
					legalFormCode: "public_limited_company",
					jurisdictionCode: "MY",
					entityTypeCode: "public_limited_company",
					effectiveFrom: "2025-05-01",
					effectiveTo: null,
					sourceDocumentId: "doc:legal-form:2",
					correctionReason: "Registrar filing",
				},
			}).success,
		).toBe(true);
		expect(
			findCompanyLegalFormAsOfInputSchema.safeParse({
				legalCompanyId,
				jurisdictionCode: "MY",
				asOf: "2025-06-30",
				knownAt: new Date("2026-01-15T10:00:00.000Z"),
			}).success,
		).toBe(true);
	});

	it("rejects invalid effective chronology", () => {
		expect(
			setCompanyLegalFormInputSchema.safeParse({
				legalCompanyId,
				legalFormCode: "private_limited_company",
				jurisdictionCode: "MY",
				entityTypeCode: "private_limited_company",
				effectiveFrom: "2025-01-01",
				effectiveTo: "2024-12-31",
				sourceDocumentId: "doc:legal-form:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(false);
	});
});
