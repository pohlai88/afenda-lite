// biome-ignore-all lint/suspicious/noUnnecessaryConditions: Explicit fallbacks document the nullable policy input contract.
import { describe, expect, it } from "vitest";

import {
	assertNonTaxCompanyIdentifierType,
	type CompanyActivity,
	type CompanyFinancialYear,
	type CompanyIdentifier,
	classifyIdentifierType,
	isTaxIdentifierType,
	normalizeCompanyIdentifier,
	resolveActivitiesAsOf,
	resolveFinancialYearAsOf,
	validateActivityAuthority,
	validateActivityEffectiveRange,
	validateFinancialYearChronology,
	validateFinancialYearEnd,
	validateFinancialYearSupersession,
	validateIdentifierAuthority,
	validateIdentifierEffectiveRange,
	validateIdentifierJurisdiction,
	validateIdentifierSupersession,
} from "../../src/company";
import { organizationIdSchema, userIdSchema } from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-identifier-rules");
const legalCompanyId = "11111111-1111-4111-8111-111111111111";
const otherLegalCompanyId = "22222222-2222-4222-8222-222222222222";
const recordedBy = userIdSchema.parse("user-ca-identifier-rules");

function identifier(input: {
	id: string;
	legalCompanyId?: string;
	identifierType?: CompanyIdentifier["identifierType"];
	normalizedIdentifierValue?: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	status?: CompanyIdentifier["status"];
	version?: number;
}): CompanyIdentifier {
	return {
		id: input.id,
		organizationId,
		legalCompanyId: input.legalCompanyId ?? legalCompanyId,
		identifierType: input.identifierType ?? "company_registration",
		jurisdictionCode: "MY",
		issuingAuthorityCode: "SSM",
		identifierValue: "2026-01234567",
		normalizedIdentifierValue:
			input.normalizedIdentifierValue ?? "202601234567",
		effectiveFrom: input.effectiveFrom,
		effectiveTo: input.effectiveTo,
		recordedAt: new Date("2026-01-01T00:00:00.000Z"),
		recordedBy,
		sourceDocumentId: "doc:identifier:1",
		correctionReason: null,
		status: input.status ?? "active",
		supersedesId: null,
		supersededAt: null,
		retiredAt: null,
		version: input.version ?? 1,
	};
}

function financialYear(input: {
	id: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	startMonth?: number;
	startDay?: number;
	recordedAt?: string;
	version?: number;
}): CompanyFinancialYear {
	return {
		id: input.id,
		organizationId,
		legalCompanyId,
		fiscalYearStartMonth: input.startMonth ?? 1,
		fiscalYearStartDay: input.startDay ?? 1,
		reportingCurrencyCode: "MYR",
		effectiveFrom: input.effectiveFrom,
		effectiveTo: input.effectiveTo,
		recordedAt: new Date(input.recordedAt ?? "2026-01-01T00:00:00.000Z"),
		recordedBy,
		sourceDocumentId: "doc:financial-year:1",
		correctionReason: null,
		status: "active",
		version: input.version ?? 1,
	};
}

function activity(input: {
	id: string;
	classification: CompanyActivity["classification"];
	effectiveFrom: string;
	effectiveTo: string | null;
	recordedAt?: string;
}): CompanyActivity {
	return {
		id: input.id,
		organizationId,
		legalCompanyId,
		activityCode: "holding_company",
		classification: input.classification,
		jurisdictionCode: "MY",
		regulatorCode: input.classification === "regulated" ? "SC" : null,
		description: "Investment holding",
		effectiveFrom: input.effectiveFrom,
		effectiveTo: input.effectiveTo,
		recordedAt: new Date(input.recordedAt ?? "2026-01-01T00:00:00.000Z"),
		recordedBy,
		sourceDocumentId: "doc:activity:1",
		status: "active",
		version: 1,
	};
}

describe("company identifier, financial-year, and activity rules", () => {
	it("normalizes identifiers by type and authority posture", () => {
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
			}).normalizedValue,
		).toBe("Ab12");
	});

	it("classifies identifier uniqueness and rejects tax ownership", () => {
		expect(
			classifyIdentifierType("legal_entity_identifier").uniquenessScope,
		).toBe("global_authority");
		expect(classifyIdentifierType("company_registration").uniquenessScope).toBe(
			"tenant_authority",
		);
		expect(classifyIdentifierType("industry_identifier").uniquenessScope).toBe(
			"company_authority",
		);
		for (const taxType of [
			"tax",
			"vat",
			"gst",
			"income_tax",
			"withholding_tax",
			"tax_registration",
		]) {
			expect(isTaxIdentifierType(taxType)).toBe(true);
			const result = assertNonTaxCompanyIdentifierType(taxType);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.details).toMatchObject({
					reason: "CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
					owner: "@afenda/master-data",
					surface: "md_tax_registration",
				});
			}
		}
	});

	it("validates identifier authority, jurisdiction, and scoped overlap", () => {
		expect(validateIdentifierAuthority("SSM").ok).toBe(true);
		expect(validateIdentifierAuthority(" ").ok).toBe(false);
		expect(validateIdentifierJurisdiction("MY").ok).toBe(true);
		expect(validateIdentifierJurisdiction("mys").ok).toBe(false);

		const existing = [
			identifier({
				id: "33333333-3333-4333-8333-333333333331",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
			}),
			identifier({
				id: "33333333-3333-4333-8333-333333333332",
				legalCompanyId: otherLegalCompanyId,
				identifierType: "industry_identifier",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
			}),
		];
		expect(
			validateIdentifierEffectiveRange({
				candidate: { from: "2025-01-01", to: null },
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				authorityCode: "SSM",
				normalizedValue: "202601234567",
				existing,
				uniquenessScope: "tenant_authority",
				legalCompanyId,
			}).ok,
		).toBe(false);
		expect(
			validateIdentifierEffectiveRange({
				candidate: { from: "2025-01-01", to: null },
				identifierType: "industry_identifier",
				jurisdictionCode: "MY",
				authorityCode: "SSM",
				normalizedValue: "202601234567",
				existing,
				uniquenessScope: "company_authority",
				legalCompanyId,
			}).ok,
		).toBe(true);
		expect(
			validateIdentifierSupersession({
				identifier: existing[0] ?? null,
				expectedVersion: 2,
			}).ok,
		).toBe(false);
	});

	it("validates and resolves financial-year history", () => {
		expect(
			validateFinancialYearEnd({
				month: 2,
				day: 29,
				allowFebruary29: true,
			}).ok,
		).toBe(true);
		expect(
			validateFinancialYearEnd({
				month: 2,
				day: 29,
				allowFebruary29: false,
			}).ok,
		).toBe(false);
		expect(validateFinancialYearEnd({ month: 4, day: 31 }).ok).toBe(false);

		const existing = [
			financialYear({
				id: "44444444-4444-4444-8444-444444444441",
				effectiveFrom: "2024-01-01",
				effectiveTo: "2025-07-01",
			}),
			financialYear({
				id: "44444444-4444-4444-8444-444444444442",
				effectiveFrom: "2025-07-01",
				effectiveTo: null,
				startMonth: 7,
				startDay: 1,
			}),
		];
		expect(
			validateFinancialYearChronology({
				candidate: { from: "2025-01-01", to: null },
				existing,
			}).ok,
		).toBe(false);
		expect(
			resolveFinancialYearAsOf({
				financialYears: existing,
				asOf: "2024-12-31",
			})?.fiscalYearStartMonth,
		).toBe(1);
		expect(
			resolveFinancialYearAsOf({
				financialYears: existing,
				asOf: "2025-07-01",
			})?.fiscalYearStartMonth,
		).toBe(7);
		expect(
			validateFinancialYearSupersession({
				financialYear: existing[0] ?? null,
				expectedVersion: 1,
			}).ok,
		).toBe(true);
	});

	it("validates and resolves distinguishable activity classifications", () => {
		expect(
			validateActivityAuthority({
				activityType: "registered_object",
				classificationSystem: "MSIC",
				activityCode: "holding_company",
				jurisdictionCode: "MY",
			}).ok,
		).toBe(true);
		expect(
			validateActivityAuthority({
				activityType: "regulated",
				classificationSystem: "SC",
				activityCode: "fund_management",
				jurisdictionCode: "MY",
				regulatorCode: null,
			}).ok,
		).toBe(false);

		const activities = [
			activity({
				id: "55555555-5555-4555-8555-555555555551",
				classification: "registered_object",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
			}),
			activity({
				id: "55555555-5555-4555-8555-555555555552",
				classification: "operational",
				effectiveFrom: "2025-01-01",
				effectiveTo: null,
			}),
		];
		expect(
			validateActivityEffectiveRange({
				candidate: { from: "2025-06-01", to: null },
				existing: activities,
				activityType: "registered_object",
				activityCode: "holding_company",
				jurisdictionCode: "MY",
			}).ok,
		).toBe(false);
		expect(
			resolveActivitiesAsOf({
				activities,
				asOf: "2025-06-01",
				activityType: "operational",
			}).map((entry) => entry.classification),
		).toEqual(["operational"]);
	});
});
