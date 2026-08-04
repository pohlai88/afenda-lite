import { randomUUID } from "node:crypto";
import {
	type CompanyActivityStore,
	type CompanyFinancialYearStore,
	type CompanyIdentifierStore,
	type LegalCompanyStore,
	registerCompanyActivity,
	registerCompanyIdentifier,
	registerLegalCompanyDraft,
	setCompanyFinancialYear,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";

import {
	caCommandOptions,
	caDraftInput,
	createDrizzleCompanyDependencies,
	expectOk,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationInfrastructureTestData,
	countCorporateAdministrationCompanyActivities,
	countCorporateAdministrationCompanyFinancialYears,
	countCorporateAdministrationCompanyIdentifiers,
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
	`company identifier, financial-year and activity Neon persistence (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("persists identity facts, audit facts and outbox events durably", async () => {
			const organizationId = `org-ca-identity-db-${randomUUID()}`;
			const dependencies = createIdentityDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-identity-db" }),
					options,
					dependencies,
				);
				expectOk(registered);

				const identifier = await registerCompanyIdentifier(
					{
						legalCompanyId: registered.data.legalCompanyId,
						identifierType: "company_registration",
						jurisdictionCode: "MY",
						issuingAuthorityCode: "SSM",
						identifierValue: "2026-01234567",
						effectiveFrom: "2026-01-01",
						effectiveTo: null,
						sourceDocumentId: "doc:identifier:db",
						expectedCompanyVersion: registered.data.version,
					},
					{ ...options, idempotencyKey: "idem-identity-db-identifier" },
					dependencies,
				);
				expectOk(identifier);

				const financialYear = await setCompanyFinancialYear(
					{
						legalCompanyId: registered.data.legalCompanyId,
						fiscalYearStartMonth: 1,
						fiscalYearStartDay: 1,
						reportingCurrencyCode: "MYR",
						effectiveFrom: "2026-01-01",
						effectiveTo: null,
						sourceDocumentId: "doc:fy:db",
						expectedCompanyVersion: registered.data.version + 1,
					},
					{ ...options, idempotencyKey: "idem-identity-db-fy" },
					dependencies,
				);
				expectOk(financialYear);

				const activity = await registerCompanyActivity(
					{
						legalCompanyId: registered.data.legalCompanyId,
						activityCode: "holding_company",
						classification: "registered_object",
						jurisdictionCode: "MY",
						regulatorCode: null,
						description: "Holding activity",
						effectiveFrom: "2026-01-01",
						effectiveTo: null,
						sourceDocumentId: "doc:activity:db",
						expectedCompanyVersion: registered.data.version + 2,
					},
					{ ...options, idempotencyKey: "idem-identity-db-activity" },
					dependencies,
				);
				expectOk(activity);

				await expect(
					countCorporateAdministrationCompanyIdentifiers(organizationId),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationCompanyFinancialYears(organizationId),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationCompanyActivities(organizationId),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(4);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});
	},
);
