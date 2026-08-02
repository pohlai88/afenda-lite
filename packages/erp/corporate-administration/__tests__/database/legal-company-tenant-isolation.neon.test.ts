import { randomUUID } from "node:crypto";

import {
	type CompanyActivityStore,
	type CompanyFinancialYearStore,
	type CompanyIdentifierStore,
	getLegalCompany,
	type LegalCompanyStore,
	listCompanyIdentifiers,
	registerCompanyIdentifier,
	registerLegalCompanyDraft,
	setCompanyJurisdictionProfile,
} from "@afenda/corporate-administration";
import {
	database as afendaDatabase,
	caCompanyJurisdictionProfile,
} from "@afenda/db";
import { describe, expect, it } from "vitest";

import {
	caCommandOptions,
	caDraftInput,
	caJurisdictionProfileInput,
	caQueryOptions,
	countCaJurisdictionProfiles,
	createDrizzleCompanyDependencies,
	expectOk,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationInfrastructureTestData,
	countCorporateAdministrationCompanyIdentifiers,
	countCorporateAdministrationMutationReceipts,
	countCorporateAdministrationOutboxEvents,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

type CompanyIdentityStore = LegalCompanyStore &
	CompanyIdentifierStore &
	CompanyFinancialYearStore &
	CompanyActivityStore;

function createIdentityDependencies() {
	const dependencies = createDrizzleCompanyDependencies();
	const store = dependencies.store as CompanyIdentityStore;
	return {
		...dependencies,
		identifierStore: store,
		financialYearStore: store,
		activityStore: store,
	};
}

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`Corporate Administration legal-company tenant isolation (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rejects cross-organization reads, writes, and relational references without disclosing the owner row", async () => {
			const ownerOrganizationId = uniqueCaOrganizationId("tenant-owner");
			const attackerOrganizationId = uniqueCaOrganizationId("tenant-attacker");
			const dependencies = createIdentityDependencies();
			const ownerOptions = caCommandOptions({
				organizationId: ownerOrganizationId,
				idempotencyKey: `idem-owner-${randomUUID()}`,
			});
			const attackerOptions = caCommandOptions({
				organizationId: attackerOrganizationId,
				idempotencyKey: `idem-attacker-${randomUUID()}`,
			});

			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-tenant-owner" }),
					ownerOptions,
					dependencies,
				);
				expectOk(registered);

				const crossOrganizationRead = await getLegalCompany(
					{ legalCompanyId: registered.data.legalCompanyId },
					caQueryOptions({ organizationId: attackerOrganizationId }),
					dependencies,
				);
				expect(crossOrganizationRead).toEqual({ ok: true, data: null });

				const crossOrganizationList = await listCompanyIdentifiers(
					{ legalCompanyId: registered.data.legalCompanyId },
					caQueryOptions({ organizationId: attackerOrganizationId }),
					dependencies,
				);
				expect(crossOrganizationList).toMatchObject({
					ok: false,
					code: "NOT_FOUND",
				});

				const crossOrganizationWrite = await setCompanyJurisdictionProfile(
					caJurisdictionProfileInput({
						legalCompanyId: registered.data.legalCompanyId,
						expectedCompanyVersion: registered.data.version,
					}),
					attackerOptions,
					dependencies,
				);
				expect(crossOrganizationWrite).toMatchObject({
					ok: false,
					code: "NOT_FOUND",
				});

				await expect(
					afendaDatabase.client.insert(caCompanyJurisdictionProfile).values({
						organizationId: attackerOrganizationId,
						legalCompanyId: registered.data.legalCompanyId,
						jurisdictionCountryCode: "MY",
						entityType: "private_limited_company",
						effectiveFrom: "2026-01-01",
						effectiveTo: null,
						recordedAt: new Date("2026-01-01T00:00:00.000Z"),
						recordedFrom: new Date("2026-01-01T00:00:00.000Z"),
						recordedBy: "tenant-isolation-test",
						sourceReference: "tenant-isolation-adversarial-reference",
					}),
				).rejects.toThrow();

				await expect(
					countCaJurisdictionProfiles(attackerOrganizationId),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceipts({
						organizationId: attackerOrganizationId,
						commandId:
							"corporate-administration.legal-company.set-jurisdiction-profile",
						idempotencyKey: attackerOptions.idempotencyKey,
					}),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationOutboxEvents(attackerOrganizationId),
				).resolves.toBe(0);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					attackerOrganizationId,
				);
				await cleanupCorporateAdministrationInfrastructureTestData(
					ownerOrganizationId,
				);
			}
		});

		it("keeps company and identifier natural keys tenant-scoped", async () => {
			const firstOrganizationId = uniqueCaOrganizationId("natural-key-first");
			const secondOrganizationId = uniqueCaOrganizationId("natural-key-second");
			const dependencies = createIdentityDependencies();
			const sharedCompanyCode = `af-shared-${randomUUID().slice(0, 8)}`;
			const sharedIdentifier = `2026-${randomUUID().replaceAll("-", "").slice(0, 12)}`;

			try {
				const firstCompany = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: sharedCompanyCode }),
					caCommandOptions({ organizationId: firstOrganizationId }),
					dependencies,
				);
				const secondCompany = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: sharedCompanyCode }),
					caCommandOptions({ organizationId: secondOrganizationId }),
					dependencies,
				);
				expectOk(firstCompany);
				expectOk(secondCompany);

				const firstIdentifier = await registerCompanyIdentifier(
					{
						legalCompanyId: firstCompany.data.legalCompanyId,
						identifierType: "company_registration",
						jurisdictionCode: "MY",
						issuingAuthorityCode: "SSM",
						identifierValue: sharedIdentifier,
						effectiveFrom: "2026-01-01",
						effectiveTo: null,
						sourceDocumentId: "doc:tenant:first",
						expectedCompanyVersion: firstCompany.data.version,
					},
					caCommandOptions({ organizationId: firstOrganizationId }),
					dependencies,
				);
				const secondIdentifier = await registerCompanyIdentifier(
					{
						legalCompanyId: secondCompany.data.legalCompanyId,
						identifierType: "company_registration",
						jurisdictionCode: "MY",
						issuingAuthorityCode: "SSM",
						identifierValue: sharedIdentifier,
						effectiveFrom: "2026-01-01",
						effectiveTo: null,
						sourceDocumentId: "doc:tenant:second",
						expectedCompanyVersion: secondCompany.data.version,
					},
					caCommandOptions({ organizationId: secondOrganizationId }),
					dependencies,
				);
				expectOk(firstIdentifier);
				expectOk(secondIdentifier);

				await expect(
					countCorporateAdministrationCompanyIdentifiers(firstOrganizationId),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationCompanyIdentifiers(secondOrganizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					firstOrganizationId,
				);
				await cleanupCorporateAdministrationInfrastructureTestData(
					secondOrganizationId,
				);
			}
		});
	},
);
