import { createMemoryCorporateAdministrationLegalCompanyStore } from "@afenda/corporate-administration/testing";
import { describe, expect, it } from "vitest";
import type {
	CompanyActivityStore,
	CompanyFinancialYearStore,
	CompanyIdentifierStore,
	LegalCompanyStore,
} from "../../src/company";
import {
	assertNonTaxCompanyIdentifierType,
	normalizeCompanyIdentifier,
	validateActivityAuthority,
} from "../../src/company";
import {
	correlationIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../src/kernel/brands";

type Ca13Store = LegalCompanyStore &
	CompanyIdentifierStore &
	CompanyFinancialYearStore &
	CompanyActivityStore;

const organizationId = organizationIdSchema.parse("org-ca-13-memory");
const otherOrganizationId = organizationIdSchema.parse(
	"org-ca-13-memory-other",
);
const actorUserId = userIdSchema.parse("user-ca-13-memory");
const correlationId = correlationIdSchema.parse("corr-ca-13-memory");

async function seedCompany(store: Ca13Store) {
	const registered = await store.registerLegalCompanyDraft({
		organizationId,
		companyCode: "AF-CA13",
		normalizedCompanyCode: "AF-CA13",
		displayName: "Afenda CA13",
		masterDataPartyId: "party-ca13",
		homeJurisdictionCountryCode: "MY",
		sourceReference: "doc:company:ca13",
		createdByUserId: actorUserId,
		createdAt: "2026-01-01T00:00:00.000Z",
		correlationId,
	});
	if (!registered.ok) {
		throw new Error("seed company failed");
	}
	return registered.data.legalCompanyId;
}

describe("company identifier, financial-year, and activity memory parity", () => {
	it("matches identifier normalization, uniqueness, future dating and supersession semantics", async () => {
		const store =
			createMemoryCorporateAdministrationLegalCompanyStore() as Ca13Store;
		const legalCompanyId = await seedCompany(store);
		const normalized = normalizeCompanyIdentifier({
			displayValue: " 2026-01234567 ",
			identifierType: "company_registration",
			authorityCode: "SSM",
		});

		expect(assertNonTaxCompanyIdentifierType("tax").ok).toBe(false);

		const first = await store.registerCompanyIdentifier({
			organizationId,
			legalCompanyId,
			identifierType: "company_registration",
			jurisdictionCode: "MY",
			issuingAuthorityCode: "SSM",
			identifierValue: normalized.displayValue,
			normalizedIdentifierValue: normalized.normalizedValue,
			effectivePeriod: { from: "2026-01-01", to: null },
			recordedAt: "2025-12-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:identifier:1",
			expectedCompanyVersion: 1,
			correlationId,
		});
		expect(first.ok).toBe(true);
		if (!first.ok) {
			throw new Error("identifier registration failed");
		}

		const duplicate = await store.registerCompanyIdentifier({
			organizationId,
			legalCompanyId,
			identifierType: "company_registration",
			jurisdictionCode: "MY",
			issuingAuthorityCode: "SSM",
			identifierValue: "202601234567",
			normalizedIdentifierValue: normalized.normalizedValue,
			effectivePeriod: { from: "2026-06-01", to: null },
			recordedAt: "2026-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:identifier:duplicate",
			expectedCompanyVersion: 2,
			correlationId,
		});
		expect(duplicate.ok).toBe(false);

		const authoritySpecific = await store.registerCompanyIdentifier({
			organizationId,
			legalCompanyId,
			identifierType: "company_registration",
			jurisdictionCode: "MY",
			issuingAuthorityCode: "ALT",
			identifierValue: "2026-01234567",
			normalizedIdentifierValue: normalized.normalizedValue,
			effectivePeriod: { from: "2026-06-01", to: null },
			recordedAt: "2026-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:identifier:authority",
			expectedCompanyVersion: 2,
			correlationId,
		});
		expect(authoritySpecific.ok).toBe(true);

		const future = await store.findCompanyIdentifierAsOf({
			organizationId,
			legalCompanyId,
			identifierType: "company_registration",
			asOf: "2025-12-31",
		});
		expect(future.ok && future.data).toBeNull();

		const superseded = await store.supersedeCompanyIdentifier({
			organizationId,
			legalCompanyId,
			companyIdentifierId: first.data.id,
			replacement: {
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				identifierValue: "2027-00000001",
				normalizedIdentifierValue: "202700000001",
				effectivePeriod: { from: "2027-01-01", to: null },
				recordedAt: "2026-12-01T00:00:00.000Z",
				sourceDocumentId: "doc:identifier:2",
				correctionReason: "Registrar replacement",
			},
			expectedIdentifierVersion: first.data.version,
			recordedByUserId: actorUserId,
			correlationId,
		});
		expect(superseded.ok).toBe(true);

		const crossTenant = await store.getCompanyIdentifier({
			organizationId: otherOrganizationId,
			legalCompanyId,
			companyIdentifierId: first.data.id,
		});
		expect(crossTenant.ok && crossTenant.data).toBeNull();
	});

	it("matches financial-year overlap and asOf/knownAt semantics", async () => {
		const store =
			createMemoryCorporateAdministrationLegalCompanyStore() as Ca13Store;
		const legalCompanyId = await seedCompany(store);

		const first = await store.setCompanyFinancialYear({
			organizationId,
			legalCompanyId,
			fiscalYearStartMonth: 1,
			fiscalYearStartDay: 1,
			reportingCurrencyCode: "MYR",
			effectivePeriod: { from: "2024-01-01", to: "2025-07-01" },
			recordedAt: "2024-01-02T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:fy:1",
			expectedCompanyVersion: 1,
			correlationId,
		});
		expect(first.ok).toBe(true);
		const overlap = await store.setCompanyFinancialYear({
			organizationId,
			legalCompanyId,
			fiscalYearStartMonth: 7,
			fiscalYearStartDay: 1,
			reportingCurrencyCode: "MYR",
			effectivePeriod: { from: "2025-01-01", to: null },
			recordedAt: "2025-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:fy:overlap",
			expectedCompanyVersion: 2,
			correlationId,
		});
		expect(overlap.ok).toBe(false);
		const second = await store.setCompanyFinancialYear({
			organizationId,
			legalCompanyId,
			fiscalYearStartMonth: 7,
			fiscalYearStartDay: 1,
			reportingCurrencyCode: "MYR",
			effectivePeriod: { from: "2025-07-01", to: null },
			recordedAt: "2026-01-15T10:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:fy:2",
			expectedCompanyVersion: 2,
			correlationId,
		});
		expect(second.ok).toBe(true);

		const beforeKnownAt = await store.findCompanyFinancialYearAsOf({
			organizationId,
			legalCompanyId,
			asOf: "2025-08-01",
			knownAt: "2025-12-31T00:00:00.000Z",
		});
		expect(beforeKnownAt.ok && beforeKnownAt.data).toBeNull();
		const afterKnownAt = await store.findCompanyFinancialYearAsOf({
			organizationId,
			legalCompanyId,
			asOf: "2025-08-01",
			knownAt: "2026-01-16T00:00:00.000Z",
		});
		expect(afterKnownAt.ok && afterKnownAt.data?.fiscalYearStartMonth).toBe(7);
	});

	it("matches activity classification, regulated validation, end dating and tenant isolation semantics", async () => {
		const store =
			createMemoryCorporateAdministrationLegalCompanyStore() as Ca13Store;
		const legalCompanyId = await seedCompany(store);

		expect(
			validateActivityAuthority({
				activityType: "regulated",
				classificationSystem: "registered_activity",
				activityCode: "fund_management",
				jurisdictionCode: "MY",
				regulatorCode: null,
			}).ok,
		).toBe(false);

		const registered = await store.registerCompanyActivity({
			organizationId,
			legalCompanyId,
			activityCode: "fund_management",
			classification: "regulated",
			jurisdictionCode: "MY",
			regulatorCode: "SC",
			description: "Fund management",
			effectivePeriod: { from: "2026-01-01", to: null },
			recordedAt: "2026-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:activity:1",
			expectedCompanyVersion: 1,
			correlationId,
		});
		expect(registered.ok).toBe(true);
		if (!registered.ok) {
			throw new Error("activity registration failed");
		}

		const invalidEnd = await store.endCompanyActivity({
			organizationId,
			legalCompanyId,
			companyActivityId: registered.data.id,
			endedAt: "2025-12-31",
			endReason: "Invalid chronology",
			expectedActivityVersion: registered.data.version,
			recordedByUserId: actorUserId,
			correlationId,
		});
		expect(invalidEnd.ok).toBe(false);

		const ended = await store.endCompanyActivity({
			organizationId,
			legalCompanyId,
			companyActivityId: registered.data.id,
			endedAt: "2026-06-30",
			endReason: "Licence expired",
			expectedActivityVersion: registered.data.version,
			recordedByUserId: actorUserId,
			correlationId,
		});
		expect(ended.ok).toBe(true);

		const crossTenant = await store.getCompanyActivity({
			organizationId: otherOrganizationId,
			legalCompanyId,
			companyActivityId: registered.data.id,
		});
		expect(crossTenant.ok && crossTenant.data).toBeNull();
	});
});
