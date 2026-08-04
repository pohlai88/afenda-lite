import { describe, expect, it } from "vitest";

import {
	type CompanyLegalForm,
	resolveCompanyLegalFormAsOf,
	validateLegalFormCompatibility,
	validateLegalFormEffectiveRange,
} from "../../src/features/company/index";
import { organizationIdSchema, userIdSchema } from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-form-history");
const legalCompanyId = "11111111-1111-4111-8111-111111111111";
const recordedBy = userIdSchema.parse("user-ca-form-history");

function form(input: {
	id: string;
	legalFormCode: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	recordedAt?: string;
	status?: CompanyLegalForm["status"];
}): CompanyLegalForm {
	return {
		id: input.id,
		organizationId,
		legalCompanyId,
		jurisdictionCode: "MY",
		legalFormCode: input.legalFormCode,
		entityTypeCode: input.legalFormCode,
		effectiveFrom: input.effectiveFrom,
		effectiveTo: input.effectiveTo,
		recordedAt: new Date(input.recordedAt ?? "2026-01-01T00:00:00.000Z"),
		recordedBy,
		sourceDocumentId: "doc:form:1",
		correctionReason: null,
		status: input.status ?? "active",
		supersedesId: null,
		supersededAt: null,
		version: 1,
	};
}

describe("company legal-form history", () => {
	it("rejects overlapping legal forms and resolves history as of a date", () => {
		const existing = [
			form({
				id: "33333333-3333-4333-8333-333333333331",
				legalFormCode: "private_limited_company",
				effectiveFrom: "2024-01-01",
				effectiveTo: "2025-05-01",
			}),
			form({
				id: "33333333-3333-4333-8333-333333333332",
				legalFormCode: "public_limited_company",
				effectiveFrom: "2025-05-01",
				effectiveTo: null,
			}),
		];

		expect(
			validateLegalFormEffectiveRange({
				candidate: { from: "2024-06-01", to: null },
				existing,
			}).ok,
		).toBe(false);
		expect(
			resolveCompanyLegalFormAsOf({
				legalForms: existing,
				asOf: "2024-12-31",
			})?.legalFormCode,
		).toBe("private_limited_company");
		expect(
			resolveCompanyLegalFormAsOf({
				legalForms: existing,
				asOf: "2025-05-01",
			})?.legalFormCode,
		).toBe("public_limited_company");
	});

	it("validates legal-form compatibility by jurisdiction and entity type", () => {
		expect(
			validateLegalFormCompatibility({
				jurisdictionCode: "MY",
				legalFormCode: "private_limited_company",
				entityTypeCode: "private_limited_company",
				rules: [
					{
						jurisdictionCode: "MY",
						legalFormCodes: ["private_limited_company"],
						entityTypeCodes: ["private_limited_company"],
						active: true,
					},
				],
			}).ok,
		).toBe(true);
		expect(
			validateLegalFormCompatibility({
				jurisdictionCode: "MY",
				legalFormCode: "public_limited_company",
				entityTypeCode: "private_limited_company",
				rules: [
					{
						jurisdictionCode: "MY",
						legalFormCodes: ["private_limited_company"],
						entityTypeCodes: ["private_limited_company"],
						active: true,
					},
				],
			}).ok,
		).toBe(false);
	});
});
