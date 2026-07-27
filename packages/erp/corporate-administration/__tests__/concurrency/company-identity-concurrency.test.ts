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
	supersedeCompanyIdentifier,
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
	`company identity Neon concurrency (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("allows only one simultaneous duplicate identifier registration", async () => {
			const organizationId = `org-ca-identifier-race-${randomUUID()}`;
			const dependencies = createIdentityDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-id-race" }),
					options,
					dependencies,
				);
				expectOk(registered);

				const attempts = await Promise.all([
					registerCompanyIdentifier(
						identifierInput(
							registered.data.legalCompanyId,
							registered.data.version,
						),
						{ ...options, idempotencyKey: "idem-id-race-1" },
						dependencies,
					),
					registerCompanyIdentifier(
						identifierInput(
							registered.data.legalCompanyId,
							registered.data.version,
						),
						{ ...options, idempotencyKey: "idem-id-race-2" },
						dependencies,
					),
				]);

				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				await expect(
					countCorporateAdministrationCompanyIdentifiers(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});

		it("allows only one simultaneous financial-year overlap", async () => {
			const organizationId = `org-ca-fy-race-${randomUUID()}`;
			const dependencies = createIdentityDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-fy-race" }),
					options,
					dependencies,
				);
				expectOk(registered);

				const attempts = await Promise.all([
					setCompanyFinancialYear(
						financialYearInput(
							registered.data.legalCompanyId,
							registered.data.version,
						),
						{ ...options, idempotencyKey: "idem-fy-race-1" },
						dependencies,
					),
					setCompanyFinancialYear(
						{
							...financialYearInput(
								registered.data.legalCompanyId,
								registered.data.version,
							),
							effectiveFrom: "2026-06-01",
						},
						{ ...options, idempotencyKey: "idem-fy-race-2" },
						dependencies,
					),
				]);

				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				await expect(
					countCorporateAdministrationCompanyFinancialYears(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});

		it("allows only one simultaneous duplicate regulated activity", async () => {
			const organizationId = `org-ca-activity-race-${randomUUID()}`;
			const dependencies = createIdentityDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-activity-race" }),
					options,
					dependencies,
				);
				expectOk(registered);

				const attempts = await Promise.all([
					registerCompanyActivity(
						activityInput(
							registered.data.legalCompanyId,
							registered.data.version,
						),
						{ ...options, idempotencyKey: "idem-activity-race-1" },
						dependencies,
					),
					registerCompanyActivity(
						activityInput(
							registered.data.legalCompanyId,
							registered.data.version,
						),
						{ ...options, idempotencyKey: "idem-activity-race-2" },
						dependencies,
					),
				]);

				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				await expect(
					countCorporateAdministrationCompanyActivities(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});

		it("allows only one simultaneous successor for one identifier", async () => {
			const organizationId = `org-ca-id-successor-race-${randomUUID()}`;
			const dependencies = createIdentityDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-id-successor" }),
					options,
					dependencies,
				);
				expectOk(registered);
				const identifier = await registerCompanyIdentifier(
					identifierInput(
						registered.data.legalCompanyId,
						registered.data.version,
					),
					{ ...options, idempotencyKey: "idem-id-successor-seed" },
					dependencies,
				);
				expectOk(identifier);

				const attempts = await Promise.all([
					supersedeCompanyIdentifier(
						successorInput(
							registered.data.legalCompanyId,
							identifier.data.id,
							identifier.data.version,
							"2027-00000001",
						),
						{ ...options, idempotencyKey: "idem-id-successor-1" },
						dependencies,
					),
					supersedeCompanyIdentifier(
						successorInput(
							registered.data.legalCompanyId,
							identifier.data.id,
							identifier.data.version,
							"2027-00000002",
						),
						{ ...options, idempotencyKey: "idem-id-successor-2" },
						dependencies,
					),
				]);

				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				await expect(
					countCorporateAdministrationCompanyIdentifiers(organizationId),
				).resolves.toBe(2);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});
	},
);

function identifierInput(
	legalCompanyId: string,
	expectedCompanyVersion: number,
) {
	return {
		legalCompanyId,
		identifierType: "company_registration" as const,
		jurisdictionCode: "MY",
		issuingAuthorityCode: "SSM",
		identifierValue: "2026-01234567",
		effectiveFrom: "2026-01-01",
		effectiveTo: null,
		sourceDocumentId: "doc:identifier:race",
		expectedCompanyVersion,
	};
}

function financialYearInput(
	legalCompanyId: string,
	expectedCompanyVersion: number,
) {
	return {
		legalCompanyId,
		fiscalYearStartMonth: 1,
		fiscalYearStartDay: 1,
		reportingCurrencyCode: "MYR",
		effectiveFrom: "2026-01-01",
		effectiveTo: null,
		sourceDocumentId: "doc:fy:race",
		expectedCompanyVersion,
	};
}

function activityInput(legalCompanyId: string, expectedCompanyVersion: number) {
	return {
		legalCompanyId,
		activityCode: "fund_management",
		classification: "regulated" as const,
		jurisdictionCode: "MY",
		regulatorCode: "SC",
		description: "Fund management",
		effectiveFrom: "2026-01-01",
		effectiveTo: null,
		sourceDocumentId: "doc:activity:race",
		expectedCompanyVersion,
	};
}

function successorInput(
	legalCompanyId: string,
	companyIdentifierId: string,
	expectedIdentifierVersion: number,
	identifierValue: string,
) {
	return {
		legalCompanyId,
		companyIdentifierId,
		replacement: {
			identifierType: "company_registration" as const,
			jurisdictionCode: "MY",
			issuingAuthorityCode: "SSM",
			identifierValue,
			effectiveFrom: "2027-01-01",
			effectiveTo: null,
			sourceDocumentId: "doc:identifier:successor",
			correctionReason: "Registrar replacement",
		},
		expectedIdentifierVersion,
	};
}
