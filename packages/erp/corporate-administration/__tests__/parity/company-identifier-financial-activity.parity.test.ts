import { describe, expect, it } from "vitest";

import { createMemoryCorporateAdministrationLegalCompanyStore } from "../../src/adapters/memory";
import type {
	CompanyActivityStore,
	CompanyFinancialYearStore,
	CompanyIdentifierStore,
	LegalCompanyStore,
} from "../../src/company";
import {
	correlationIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../src/kernel/brands";

type CompanyIdentityStore = LegalCompanyStore &
	CompanyIdentifierStore &
	CompanyFinancialYearStore &
	CompanyActivityStore;

const organizationId = organizationIdSchema.parse("org-ca-identity-parity");
const actorUserId = userIdSchema.parse("user-ca-identity-parity");
const correlationId = correlationIdSchema.parse("corr-ca-identity-parity");

async function seedCompany(store: CompanyIdentityStore) {
	const registered = await store.registerLegalCompanyDraft({
		organizationId,
		companyCode: "AF-IDENTITY-PARITY",
		normalizedCompanyCode: "AF-IDENTITY-PARITY",
		displayName: "Afenda Identity Parity",
		masterDataPartyId: "party-identity-parity",
		homeJurisdictionCountryCode: "MY",
		sourceReference: "doc:company:identity-parity",
		createdByUserId: actorUserId,
		createdAt: "2026-01-01T00:00:00.000Z",
		correlationId,
	});
	if (!registered.ok) throw new Error("seed company failed");
	return registered.data.legalCompanyId;
}

describe("company identifier, financial and activity parity surface", () => {
	it("matches memory semantics for identifier, financial-year and activity histories", async () => {
		const store =
			createMemoryCorporateAdministrationLegalCompanyStore() as CompanyIdentityStore;
		const legalCompanyId = await seedCompany(store);

		const identifier = await store.registerCompanyIdentifier({
			organizationId,
			legalCompanyId,
			identifierType: "company_registration",
			jurisdictionCode: "MY",
			issuingAuthorityCode: "SSM",
			identifierValue: "2026-01234567",
			normalizedIdentifierValue: "202601234567",
			effectivePeriod: { from: "2026-01-01", to: null },
			recordedAt: "2026-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:identifier:parity",
			expectedCompanyVersion: 1,
			correlationId,
		});
		expect(identifier.ok).toBe(true);

		const financialYear = await store.setCompanyFinancialYear({
			organizationId,
			legalCompanyId,
			fiscalYearStartMonth: 1,
			fiscalYearStartDay: 1,
			reportingCurrencyCode: "MYR",
			effectivePeriod: { from: "2026-01-01", to: null },
			recordedAt: "2026-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:fy:parity",
			expectedCompanyVersion: 2,
			correlationId,
		});
		expect(financialYear.ok).toBe(true);

		const activity = await store.registerCompanyActivity({
			organizationId,
			legalCompanyId,
			activityCode: "holding_company",
			classification: "registered_object",
			jurisdictionCode: "MY",
			regulatorCode: null,
			description: "Holding activity",
			effectivePeriod: { from: "2026-01-01", to: null },
			recordedAt: "2026-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:activity:parity",
			expectedCompanyVersion: 3,
			correlationId,
		});
		expect(activity.ok).toBe(true);

		await expect(
			store.findCompanyIdentifierAsOf({
				organizationId,
				legalCompanyId,
				identifierType: "company_registration",
				asOf: "2026-06-01",
			}),
		).resolves.toMatchObject({
			ok: true,
			data: { identifierType: "company_registration" },
		});
		await expect(
			store.findCompanyFinancialYearAsOf({
				organizationId,
				legalCompanyId,
				asOf: "2026-06-01",
			}),
		).resolves.toMatchObject({
			ok: true,
			data: { reportingCurrencyCode: "MYR" },
		});
		await expect(
			store.listCompanyActivitiesAsOf({
				organizationId,
				legalCompanyId,
				asOf: "2026-06-01",
				classification: "registered_object",
			}),
		).resolves.toMatchObject({
			ok: true,
			data: [{ activityCode: "holding_company" }],
		});
	});
});
