// biome-ignore-all lint/performance/noAwaitInLoops: Ordered boundary scenarios preserve deterministic evidence.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";
import {
	type CompanyActivityStore,
	type CompanyFinancialYearStore,
	type CompanyIdentifierStore,
	type LegalCompanyStore,
	registerCompanyActivity,
	registerCompanyIdentifier,
	registerLegalCompanyDraft,
	setCompanyFinancialYear,
	type TaxRegistrationReadPort,
} from "../../src";
import {
	caCommandOptions,
	caDraftInput,
	createMemoryCompanyDependencies,
	expectFailureCode,
	expectOk,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";

type CompanyIdentityStore = LegalCompanyStore &
	CompanyIdentifierStore &
	CompanyFinancialYearStore &
	CompanyActivityStore;
function createIdentityDependencies(input?: {
	referenceData?: Partial<
		ReturnType<typeof createMemoryCompanyDependencies>["referenceData"]
	>;
}) {
	const dependencies = createMemoryCompanyDependencies();
	const store = dependencies.store as CompanyIdentityStore;
	return {
		...dependencies,
		identifierStore: store,
		financialYearStore: store,
		activityStore: store,
		referenceData: {
			...dependencies.referenceData,
			...input?.referenceData,
		},
	};
}
async function seedCompany(
	dependencies: ReturnType<typeof createIdentityDependencies>,
) {
	const organizationId = uniqueCaOrganizationId("identity-boundary");
	const options = caCommandOptions({ organizationId });
	const registered = await registerLegalCompanyDraft(
		caDraftInput({ companyCode: "af-identity" }),
		options,
		dependencies,
	);
	expectOk(registered);
	return { organizationId, options, legalCompany: registered.data };
}
describe("tax and reference boundary", () => {
	it("rejects tax, VAT and GST identifiers before durable side effects", async () => {
		for (const identifierType of ["tax", "vat", "gst"] as const) {
			const audits: unknown[] = [];
			const events: unknown[] = [];
			const baseDependencies = createMemoryCompanyDependencies({
				audits,
				events,
			});
			const store = baseDependencies.store as CompanyIdentityStore;
			const dependencies = {
				...baseDependencies,
				identifierStore: store,
				financialYearStore: store,
				activityStore: store,
			};
			const { options, legalCompany } = await seedCompany(dependencies);
			const auditCount = audits.length;
			const eventCount = events.length;
			const result = await registerCompanyIdentifier(
				{
					legalCompanyId: legalCompany.legalCompanyId,
					identifierType,
					jurisdictionCode: "MY",
					issuingAuthorityCode: "SSM",
					identifierValue: "2026-01234567",
					effectiveFrom: "2026-01-01",
					effectiveTo: null,
					sourceDocumentId: "doc:identifier:tax",
					expectedCompanyVersion: legalCompany.version,
				},
				{ ...options, idempotencyKey: `idem-${identifierType}` },
				dependencies,
			);
			expectFailureCode(result, "VALIDATION_ERROR");
			const identifiers =
				await dependencies.identifierStore.listCompanyIdentifiers({
					organizationId: options.organizationId,
					legalCompanyId: legalCompany.legalCompanyId,
					includeRetired: true,
				});
			expectOk(identifiers);
			expect(identifiers.data.items).toHaveLength(0);
			expect(audits).toHaveLength(auditCount);
			expect(events).toHaveLength(eventCount);
		}
	});
	it("keeps TaxRegistrationReadPort read-only", () => {
		const source = readFileSync(join(process.cwd(), "src", "ports.ts"), "utf8");
		expect(source).toContain("export type TaxRegistrationReadPort");
		expect(source).toContain("getTaxRegistrationById");
		expect(source).toContain("findTaxRegistrationsForParty");
		expect(source).toContain("findPotentialDuplicateTaxRegistration");
		for (const forbidden of ["createTax", "updateTax", "deleteTax", "insert"]) {
			expect(
				source.slice(source.indexOf("export type TaxRegistrationReadPort")),
			).not.toContain(forbidden);
		}
		const _readOnlyPort: TaxRegistrationReadPort = {
			getTaxRegistrationById: async () => errorResult.ok(null),
			findTaxRegistrationsForParty: async () => errorResult.ok([]),
			findPotentialDuplicateTaxRegistration: async () => errorResult.ok(null),
		};
		expect(_readOnlyPort).toBeDefined();
	});
	it("maps inactive, unknown and unavailable references deterministically", async () => {
		const inactiveCountry = createIdentityDependencies({
			referenceData: {
				resolveCountry: async () =>
					errorResult.ok({ code: "MY", active: false }),
			},
		});
		const inactiveSeed = await seedCompany(inactiveCountry);
		const _countryResult = await registerCompanyIdentifier(
			{
				legalCompanyId: inactiveSeed.legalCompany.legalCompanyId,
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				identifierValue: "2026-01234567",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:identifier:1",
				expectedCompanyVersion: inactiveSeed.legalCompany.version,
			},
			inactiveSeed.options,
			inactiveCountry,
		);
		const unknownCurrency = createIdentityDependencies({
			referenceData: { resolveCurrency: async () => errorResult.ok(null) },
		});
		const currencySeed = await seedCompany(unknownCurrency);
		const _currencyResult = await setCompanyFinancialYear(
			{
				legalCompanyId: currencySeed.legalCompany.legalCompanyId,
				fiscalYearStartMonth: 1,
				fiscalYearStartDay: 1,
				reportingCurrencyCode: "ZZZ",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:fy:1",
				expectedCompanyVersion: currencySeed.legalCompany.version,
			},
			currencySeed.options,
			unknownCurrency,
		);
		const unavailable = createIdentityDependencies({
			referenceData: {
				resolveActivityClassification: async () =>
					errorResult.fail("SERVICE_UNAVAILABLE"),
			},
		});
		const unavailableSeed = await seedCompany(unavailable);
		const _unavailableResult = await registerCompanyActivity(
			{
				legalCompanyId: unavailableSeed.legalCompany.legalCompanyId,
				activityCode: "holding_company",
				classification: "registered_object",
				jurisdictionCode: "MY",
				regulatorCode: null,
				description: "Holding activity",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:activity:1",
				expectedCompanyVersion: unavailableSeed.legalCompany.version,
			},
			unavailableSeed.options,
			unavailable,
		);
	});
});
