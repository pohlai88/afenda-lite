import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fail, ok } from "@afenda/errors/result";
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

function failureReason(result: unknown): string | undefined {
	return typeof result === "object" &&
		result !== null &&
		"details" in result &&
		typeof result.details === "object" &&
		result.details !== null &&
		"reason" in result.details
		? String(result.details.reason)
		: undefined;
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
			expect(failureReason(result)).toBe(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
			);
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
			getTaxRegistrationById: async () => ok(null),
			findTaxRegistrationsForParty: async () => ok([]),
			findPotentialDuplicateTaxRegistration: async () => ok(null),
		};
		expect(_readOnlyPort).toBeDefined();
	});

	it("maps inactive, unknown and unavailable references deterministically", async () => {
		const inactiveCountry = createIdentityDependencies({
			referenceData: {
				resolveCountry: async () => ok({ code: "MY", active: false }),
			},
		});
		const inactiveSeed = await seedCompany(inactiveCountry);
		const countryResult = await registerCompanyIdentifier(
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
		expect(failureReason(countryResult)).toBe(
			"CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
		);

		const unknownCurrency = createIdentityDependencies({
			referenceData: { resolveCurrency: async () => ok(null) },
		});
		const currencySeed = await seedCompany(unknownCurrency);
		const currencyResult = await setCompanyFinancialYear(
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
		expect(failureReason(currencyResult)).toBe(
			"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
		);

		const unavailable = createIdentityDependencies({
			referenceData: {
				resolveActivityClassification: async () =>
					fail("SERVICE_UNAVAILABLE", "Reference service unavailable.", {
						reason: "CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
					}),
			},
		});
		const unavailableSeed = await seedCompany(unavailable);
		const unavailableResult = await registerCompanyActivity(
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
		expect(failureReason(unavailableResult)).toBe(
			"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
		);
	});
});
