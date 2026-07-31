import { describe, expect, it } from "vitest";
import {
	assertNonTaxCompanyIdentifierType,
	classifyIdentifierType,
	isTaxIdentifierType,
	normalizeCompanyIdentifier,
	validateIdentifierEffectiveRange,
} from "../../src/company";

describe("company identifier rules", () => {
	it("rejects tax-owned identifier types with Master Data ownership metadata", () => {
		for (const taxType of [
			"tax",
			"vat",
			"gst",
			"income_tax",
			"withholding_tax",
		]) {
			expect(isTaxIdentifierType(taxType)).toBe(true);
			const result = assertNonTaxCompanyIdentifierType(taxType);
			expect(result.ok).toBe(false);
		}
	});
	it("normalizes identifiers by authority posture without losing display value", () => {
		expect(
			normalizeCompanyIdentifier({
				displayValue: " 2026-01234567 ",
				identifierType: "company_registration",
				authorityCode: "SSM",
			}),
		).toEqual({
			displayValue: "2026-01234567",
			normalizedValue: "202601234567",
		});
		expect(
			normalizeCompanyIdentifier({
				displayValue: "Ab-12",
				identifierType: "other_non_tax_identifier",
				caseSensitive: true,
			}),
		).toEqual({ displayValue: "Ab-12", normalizedValue: "Ab12" });
	});
	it("allows same value under different authority and non-overlapping history", () => {
		const existing = [
			{
				id: "identifier-1",
				legalCompanyId: "company-1",
				identifierType: "company_registration" as const,
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				normalizedIdentifierValue: "202601234567",
				effectiveFrom: "2024-01-01",
				effectiveTo: "2025-01-01",
				status: "active" as const,
			},
		];
		expect(
			validateIdentifierEffectiveRange({
				candidate: { from: "2024-06-01", to: null },
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				authorityCode: "SSM",
				normalizedValue: "202601234567",
				existing,
				legalCompanyId: "company-1",
				uniquenessScope: classifyIdentifierType("company_registration")
					.uniquenessScope,
			}).ok,
		).toBe(false);
		expect(
			validateIdentifierEffectiveRange({
				candidate: { from: "2024-06-01", to: null },
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				authorityCode: "ALT",
				normalizedValue: "202601234567",
				existing,
				legalCompanyId: "company-1",
				uniquenessScope: "tenant_authority",
			}).ok,
		).toBe(true);
		expect(
			validateIdentifierEffectiveRange({
				candidate: { from: "2025-01-01", to: null },
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				authorityCode: "SSM",
				normalizedValue: "202601234567",
				existing,
				legalCompanyId: "company-1",
				uniquenessScope: "tenant_authority",
			}).ok,
		).toBe(true);
	});
});
