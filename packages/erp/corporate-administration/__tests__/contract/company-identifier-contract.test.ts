import { describe, expect, expectTypeOf, it } from "vitest";
import type {
	CompanyActivity,
	CompanyActivityId,
	CompanyActivityListItem,
	CompanyActivityListPage,
	CompanyActivityStatus,
	CompanyActivityType,
	CompanyFinancialYear,
	CompanyFinancialYearId,
	CompanyIdentifier,
	CompanyIdentifierId,
	CompanyIdentifierListItem,
	CompanyIdentifierListPage,
	CompanyIdentifierStatus,
	CompanyIdentifierType,
} from "../../src/company";
import {
	assertNonTaxCompanyIdentifierType,
	companyActivityTypeSchema,
	companyIdentifierAuthoritySchema,
	companyIdentifierTypeSchema,
	financialYearCalendarSchema,
	financialYearEndSchema,
	findCompanyFinancialYearAsOfInputSchema,
	findCompanyIdentifierAsOfInputSchema,
	listCompanyActivitiesAsOfInputSchema,
	listCompanyIdentifiersInputSchema,
	registerCompanyActivityInputSchema,
	registerCompanyIdentifierInputSchema,
	setCompanyFinancialYearInputSchema,
	sourceEvidenceSchema,
	supersedeCompanyIdentifierInputSchema,
} from "../../src/company";

const legalCompanyId = "11111111-1111-4111-8111-111111111111";
const companyIdentifierId = "22222222-2222-4222-8222-222222222222";
const approvedIdentifierTypes = [
	"company_registration",
	"registry_number",
	"business_registration",
	"foreign_registration",
	"legal_entity_identifier",
	"statistical_identifier",
	"industry_identifier",
	"other_non_tax_identifier",
] as const;

describe("company identifier, financial-year, and activity contracts", () => {
	it("exports the CA-1.3 domain type surface", () => {
		expectTypeOf<CompanyIdentifierId>().toEqualTypeOf<
			CompanyIdentifier["id"]
		>();
		expectTypeOf<CompanyFinancialYearId>().toEqualTypeOf<
			CompanyFinancialYear["id"]
		>();
		expectTypeOf<CompanyActivityId>().toEqualTypeOf<CompanyActivity["id"]>();
		expectTypeOf<CompanyIdentifierType>().toEqualTypeOf<
			CompanyIdentifier["identifierType"]
		>();
		expectTypeOf<CompanyIdentifierStatus>().toEqualTypeOf<
			CompanyIdentifier["status"]
		>();
		expectTypeOf<CompanyActivityType>().toEqualTypeOf<
			CompanyActivity["classification"]
		>();
		expectTypeOf<CompanyActivityStatus>().toEqualTypeOf<
			CompanyActivity["status"]
		>();
		expectTypeOf<
			CompanyIdentifierListPage["items"][number]
		>().toEqualTypeOf<CompanyIdentifierListItem>();
		expectTypeOf<
			CompanyActivityListPage["items"][number]
		>().toEqualTypeOf<CompanyActivityListItem>();
	});

	it("accepts the approved non-tax identifier vocabulary", () => {
		for (const identifierType of approvedIdentifierTypes) {
			expect(companyIdentifierTypeSchema.parse(identifierType)).toBe(
				identifierType,
			);
		}
	});

	it("rejects tax-like identifier ownership deterministically", () => {
		for (const forbidden of [
			"tax",
			"vat",
			"gst",
			"sales_tax",
			"service_tax",
			"income_tax",
			"withholding_tax",
			"tax_registration",
		]) {
			const boundary = assertNonTaxCompanyIdentifierType(forbidden);
			expect(boundary.ok).toBe(false);
			if (!boundary.ok) {
				expect(boundary.message).toContain("Master Data tax registration");
			}
			expect(companyIdentifierTypeSchema.safeParse(forbidden).success).toBe(
				false,
			);
		}
	});

	it("exposes the supporting schemas named by CA-1.3", () => {
		expect(companyIdentifierAuthoritySchema.safeParse("SSM").success).toBe(
			true,
		);
		expect(
			companyActivityTypeSchema.safeParse("registered_object").success,
		).toBe(true);
		expect(
			financialYearEndSchema.safeParse({ month: 12, day: 31 }).success,
		).toBe(true);
		expect(
			financialYearCalendarSchema.safeParse({
				fiscalYearStartMonth: 1,
				fiscalYearStartDay: 1,
				reportingCurrencyCode: "MYR",
			}).success,
		).toBe(true);
		expect(sourceEvidenceSchema.safeParse("doc:evidence:1").success).toBe(true);
	});

	it("accepts intended command and query payloads", () => {
		expect(
			registerCompanyIdentifierInputSchema.safeParse({
				legalCompanyId,
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				identifierValue: "202401000001",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:identifier:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(true);
		expect(
			supersedeCompanyIdentifierInputSchema.safeParse({
				legalCompanyId,
				companyIdentifierId,
				expectedIdentifierVersion: 1,
				replacement: {
					identifierType: "registry_number",
					jurisdictionCode: "MY",
					issuingAuthorityCode: "SSM",
					identifierValue: "202401000002",
					effectiveFrom: "2025-01-01",
					effectiveTo: null,
					sourceDocumentId: "doc:identifier:2",
					correctionReason: "Registrar correction",
				},
			}).success,
		).toBe(true);
		expect(
			setCompanyFinancialYearInputSchema.safeParse({
				legalCompanyId,
				fiscalYearStartMonth: 1,
				fiscalYearStartDay: 1,
				reportingCurrencyCode: "MYR",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:financial-year:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(true);
		expect(
			registerCompanyActivityInputSchema.safeParse({
				legalCompanyId,
				activityCode: "holding_company",
				classification: "registered_object",
				jurisdictionCode: "MY",
				regulatorCode: "ssm",
				description: "Investment holding",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:activity:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(true);
		expect(
			listCompanyIdentifiersInputSchema.safeParse({
				legalCompanyId,
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				authorityCode: "SSM",
				activeAt: "2025-01-01",
				includeRetired: true,
			}).success,
		).toBe(true);
		expect(
			findCompanyIdentifierAsOfInputSchema.safeParse({
				legalCompanyId,
				identifierType: "company_registration",
				authorityCode: "SSM",
				asOf: "2025-01-01",
				knownAt: new Date("2026-01-15T10:00:00.000Z"),
			}).success,
		).toBe(true);
		expect(
			findCompanyFinancialYearAsOfInputSchema.safeParse({
				legalCompanyId,
				asOf: "2025-01-01",
			}).success,
		).toBe(true);
		expect(
			listCompanyActivitiesAsOfInputSchema.safeParse({
				legalCompanyId,
				activityType: "regulated",
				classificationSystem: "registered_activity",
				jurisdictionCode: "MY",
				regulatorCode: "ssm",
				primaryOnly: true,
				asOf: "2025-01-01",
			}).success,
		).toBe(true);
	});

	it("keeps legacy query field names accepted during CA-1.3 normalization", () => {
		expect(
			findCompanyIdentifierAsOfInputSchema.safeParse({
				legalCompanyId,
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				asOf: "2025-01-01",
			}).success,
		).toBe(true);
		expect(
			listCompanyActivitiesAsOfInputSchema.safeParse({
				legalCompanyId,
				classification: "operational",
				jurisdictionCode: "MY",
				asOf: "2025-01-01",
			}).success,
		).toBe(true);
	});
});
