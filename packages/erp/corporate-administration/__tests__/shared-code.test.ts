import { describe, expect, it } from "vitest";

import {
	buildCompanyIdentifierIdempotencyMaterial,
	isRegistrationIdentifierType,
	isTaxIdentifierType,
	normalizeCompanyCode,
	normalizeCompanyName,
	normalizeCorporateCode,
	normalizeCorporateIdentifier,
	normalizeDisplayName,
	normalizeIdentifierValue,
} from "../src/shared/code";

describe("@afenda/corporate-administration shared/code", () => {
	describe("normalizeCorporateCode", () => {
		it("NFKC-trims, collapses whitespace, and uppercases", () => {
			expect(normalizeCorporateCode("  co\u00a0a  ")).toBe("CO A");
		});
	});

	describe("normalizeCompanyName", () => {
		it("NFKC-trims, collapses whitespace, and uppercases", () => {
			expect(normalizeCompanyName("  acme   holdings  ")).toBe(
				"ACME HOLDINGS",
			);
		});
	});

	describe("normalizeCorporateIdentifier", () => {
		it("strips non-identifier characters for company_registration", () => {
			expect(
				normalizeCorporateIdentifier("company_registration", "ABC-123"),
			).toBe("ABC123");
		});

		it("strips non-identifier characters for registration_number alias", () => {
			expect(
				normalizeCorporateIdentifier("registration_number", "12.34/56"),
			).toBe("123456");
		});

		it("strips non-identifier characters for lei", () => {
			expect(normalizeCorporateIdentifier("lei", "5493-00-ABC")).toBe(
				"549300ABC",
			);
		});

		it("collapses whitespace only for other identifier types", () => {
			expect(
				normalizeCorporateIdentifier("trade_license", "TL  123  A"),
			).toBe("TL 123 A");
		});
	});

	describe("isRegistrationIdentifierType", () => {
		it("matches corporate registration aliases with normalized keys", () => {
			expect(isRegistrationIdentifierType("company_registration")).toBe(true);
			expect(isRegistrationIdentifierType(" company_registration_number ")).toBe(
				true,
			);
			expect(isRegistrationIdentifierType("Registration_Number")).toBe(true);
			expect(isRegistrationIdentifierType("registration_number")).toBe(true);
			expect(isRegistrationIdentifierType("LEI")).toBe(true);
			expect(isRegistrationIdentifierType("lei")).toBe(true);
		});

		it("does not match tax or unrelated identifier types", () => {
			expect(isRegistrationIdentifierType("tin")).toBe(false);
			expect(isRegistrationIdentifierType("trade_license")).toBe(false);
		});
	});

	describe("isTaxIdentifierType", () => {
		it("matches expanded tax identifier types with snake-case fold", () => {
			expect(isTaxIdentifierType("vat_registration")).toBe(true);
			expect(isTaxIdentifierType("VAT Registration")).toBe(true);
			expect(isTaxIdentifierType("tax_number")).toBe(true);
		});

		it("does not match corporate registration types", () => {
			expect(isTaxIdentifierType("company_registration")).toBe(false);
		});
	});

	describe("Result wrappers", () => {
		it("normalizeCompanyCode rejects blank input", () => {
			const result = normalizeCompanyCode("   ");
			expect(result.ok).toBe(false);
		});

		it("normalizeDisplayName applies company name normalization", () => {
			const result = normalizeDisplayName("  acme  ");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.data.normalizedName).toBe("ACME");
			}
		});

		it("normalizeIdentifierValue uses type-aware normalization when type is provided", () => {
			const result = normalizeIdentifierValue("ABC-123", "company_registration");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.data.normalizedValue).toBe("ABC123");
			}
		});

		it("normalizeIdentifierValue collapses whitespace when type is omitted", () => {
			const result = normalizeIdentifierValue("POL  123");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.data.normalizedValue).toBe("POL 123");
			}
		});
	});

	describe("buildCompanyIdentifierIdempotencyMaterial", () => {
		it("builds stable keys from normalized type and value", () => {
			const material = buildCompanyIdentifierIdempotencyMaterial({
				legalCompanyId: "10000000-0000-4000-8000-000000000001",
				identifierType: " company_registration ",
				identifierValue: "ABC-123",
			});

			expect(material.identifierType).toBe("company_registration");
			expect(material.normalizedIdentifierValue).toBe("ABC123");
			expect(material.idempotencyKey).toBe(
				"id:10000000-0000-4000-8000-000000000001:company_registration:ABC123",
			);
		});
	});
});
