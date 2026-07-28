import { createMemoryCorporateAdministrationLegalCompanyStore } from "@afenda/corporate-administration/testing";
import { describe, expect, it } from "vitest";
import type {
	CompanyLegalFormStore,
	CompanyNameStore,
	LegalCompanyStore,
} from "../../src/company";
import {
	correlationIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../src/kernel/brands";

type CompanyHistoryStore = LegalCompanyStore &
	CompanyNameStore &
	CompanyLegalFormStore;

const organizationId = organizationIdSchema.parse("org-ca-parity");
const actorUserId = userIdSchema.parse("user-ca-parity");
const correlationId = correlationIdSchema.parse("corr-ca-parity");

async function seedCompany(store: CompanyHistoryStore) {
	const registered = await store.registerLegalCompanyDraft({
		organizationId,
		companyCode: "AF-PARITY",
		normalizedCompanyCode: "AF-PARITY",
		displayName: "Afenda Parity",
		masterDataPartyId: "party-parity",
		homeJurisdictionCountryCode: "MY",
		sourceReference: "doc:company:parity",
		createdByUserId: actorUserId,
		createdAt: "2026-01-01T00:00:00.000Z",
		correlationId,
	});
	if (!registered.ok) throw new Error("seed company failed");
	return registered.data.legalCompanyId;
}

describe("company name and legal-form store parity", () => {
	it("preserves tenant, asOf, knownAt and deterministic ordering semantics", async () => {
		const store =
			createMemoryCorporateAdministrationLegalCompanyStore() as CompanyHistoryStore;
		const seededLegalCompanyId = await seedCompany(store);

		const first = await store.addCompanyName({
			organizationId,
			legalCompanyId: seededLegalCompanyId,
			nameType: "legal",
			languageCode: "en",
			displayName: "Alpha Private Limited",
			normalizedName: "alpha private limited",
			effectivePeriod: { from: "2024-01-01", to: "2025-05-01" },
			recordedAt: "2024-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:name:1",
			expectedCompanyVersion: 1,
			correlationId,
		});
		expect(first.ok).toBe(true);
		const second = await store.addCompanyName({
			organizationId,
			legalCompanyId: seededLegalCompanyId,
			nameType: "legal",
			languageCode: "en",
			displayName: "Alpha Holdings Private Limited",
			normalizedName: "alpha holdings private limited",
			effectivePeriod: { from: "2025-05-01", to: null },
			recordedAt: "2025-05-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:name:2",
			expectedCompanyVersion: 2,
			correlationId,
		});
		expect(second.ok).toBe(true);

		const historical = await store.findCompanyNameAsOf({
			organizationId,
			legalCompanyId: seededLegalCompanyId,
			nameType: "legal",
			languageCode: "en",
			asOf: "2024-12-31",
		});
		const current = await store.findCompanyNameAsOf({
			organizationId,
			legalCompanyId: seededLegalCompanyId,
			nameType: "legal",
			languageCode: "en",
			asOf: "2025-05-01",
		});
		const list = await store.listCompanyNames({
			organizationId,
			legalCompanyId: seededLegalCompanyId,
			includeFormer: true,
		});
		const crossTenant = await store.findCompanyNameAsOf({
			organizationId: organizationIdSchema.parse("org-ca-parity-other"),
			legalCompanyId: seededLegalCompanyId,
			nameType: "legal",
			languageCode: "en",
			asOf: "2025-05-01",
		});

		expect(historical.ok && historical.data?.displayName).toBe(
			"Alpha Private Limited",
		);
		expect(current.ok && current.data?.displayName).toBe(
			"Alpha Holdings Private Limited",
		);
		expect(list.ok && list.data.items.map((item) => item.displayName)).toEqual([
			"Alpha Holdings Private Limited",
			"Alpha Private Limited",
		]);
		expect(crossTenant.ok && crossTenant.data).toBeNull();
	});

	it("rejects duplicate normalized names and overlapping legal forms", async () => {
		const store =
			createMemoryCorporateAdministrationLegalCompanyStore() as CompanyHistoryStore;
		const seededLegalCompanyId = await seedCompany(store);

		await store.addCompanyName({
			organizationId,
			legalCompanyId: seededLegalCompanyId,
			nameType: "legal",
			languageCode: "en",
			displayName: "Café Holdings",
			normalizedName: "café holdings",
			effectivePeriod: { from: "2024-01-01", to: null },
			recordedAt: "2024-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:name:1",
			expectedCompanyVersion: 1,
			correlationId,
		});
		const duplicate = await store.findOverlappingCompanyName({
			organizationId,
			legalCompanyId: seededLegalCompanyId,
			nameType: "legal",
			languageCode: "en",
			normalizedName: "café holdings",
			effectivePeriod: { from: "2024-06-01", to: null },
		});
		expect(duplicate.ok && duplicate.data?.displayName).toBe("Café Holdings");

		await store.setCompanyLegalForm({
			organizationId,
			legalCompanyId: seededLegalCompanyId,
			legalFormCode: "private_limited_company",
			jurisdictionCode: "MY",
			entityTypeCode: "private_limited_company",
			effectivePeriod: { from: "2024-01-01", to: null },
			recordedAt: "2024-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: "doc:form:1",
			expectedCompanyVersion: 2,
			correlationId,
		});
		const legalFormOverlap = await store.findOverlappingCompanyLegalForm({
			organizationId,
			legalCompanyId: seededLegalCompanyId,
			effectivePeriod: { from: "2024-06-01", to: null },
		});
		expect(legalFormOverlap.ok && legalFormOverlap.data?.legalFormCode).toBe(
			"private_limited_company",
		);
	});
});
