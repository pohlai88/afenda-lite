import { randomUUID } from "node:crypto";
import {
	addCompanyName,
	type CompanyLegalFormStore,
	type CompanyNameStore,
	type LegalCompanyStore,
	registerLegalCompanyDraft,
	setCompanyJurisdictionProfile,
	setCompanyLegalForm,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";

import {
	caCommandOptions,
	caDraftInput,
	caJurisdictionProfileInput,
	createDrizzleCompanyDependencies,
	expectOk,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationInfrastructureTestData,
	countCorporateAdministrationOutboxEvents,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

type CompanyHistoryStore = LegalCompanyStore &
	CompanyNameStore &
	CompanyLegalFormStore;

function createHistoryDependencies() {
	const dependencies = createDrizzleCompanyDependencies();
	const store = dependencies.store as CompanyHistoryStore;
	return {
		...dependencies,
		nameStore: store,
		legalFormStore: store,
	};
}

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`company name and legal-form Neon concurrency (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("allows only one simultaneous overlapping legal-name insert", async () => {
			const organizationId = `org-ca-name-race-${randomUUID()}`;
			const dependencies = createHistoryDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-name-race" }),
					options,
					dependencies,
				);
				expectOk(registered);

				const attempts = await Promise.all([
					addCompanyName(
						{
							legalCompanyId: registered.data.legalCompanyId,
							nameType: "legal",
							languageCode: "en",
							displayName: "Café Holdings",
							effectiveFrom: "2024-01-01",
							effectiveTo: null,
							sourceDocumentId: "doc:name:1",
							expectedCompanyVersion: registered.data.version,
						},
						{ ...options, idempotencyKey: "idem-name-race-1" },
						dependencies,
					),
					addCompanyName(
						{
							legalCompanyId: registered.data.legalCompanyId,
							nameType: "legal",
							languageCode: "en",
							displayName: "Cafe\u0301 Holdings",
							effectiveFrom: "2024-06-01",
							effectiveTo: null,
							sourceDocumentId: "doc:name:2",
							expectedCompanyVersion: registered.data.version,
						},
						{ ...options, idempotencyKey: "idem-name-race-2" },
						dependencies,
					),
				]);

				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(2);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});

		it("allows only one simultaneous overlapping legal-form insert", async () => {
			const organizationId = `org-ca-form-race-${randomUUID()}`;
			const dependencies = createHistoryDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-form-race" }),
					options,
					dependencies,
				);
				expectOk(registered);
				const jurisdiction = await setCompanyJurisdictionProfile(
					caJurisdictionProfileInput({
						legalCompanyId: registered.data.legalCompanyId,
						expectedCompanyVersion: registered.data.version,
					}),
					{ ...options, idempotencyKey: "idem-form-race-jurisdiction" },
					dependencies,
				);
				expectOk(jurisdiction);

				const attempts = await Promise.all([
					setCompanyLegalForm(
						{
							legalCompanyId: registered.data.legalCompanyId,
							legalFormCode: "private_limited_company",
							jurisdictionCode: "MY",
							entityTypeCode: "private_limited_company",
							effectiveFrom: "2024-01-01",
							effectiveTo: null,
							sourceDocumentId: "doc:form:1",
							expectedCompanyVersion: registered.data.version + 1,
						},
						{ ...options, idempotencyKey: "idem-form-race-1" },
						dependencies,
					),
					setCompanyLegalForm(
						{
							legalCompanyId: registered.data.legalCompanyId,
							legalFormCode: "private_limited_company",
							jurisdictionCode: "MY",
							entityTypeCode: "private_limited_company",
							effectiveFrom: "2024-06-01",
							effectiveTo: null,
							sourceDocumentId: "doc:form:2",
							expectedCompanyVersion: registered.data.version + 1,
						},
						{ ...options, idempotencyKey: "idem-form-race-2" },
						dependencies,
					),
				]);

				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(3);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});
	},
);
