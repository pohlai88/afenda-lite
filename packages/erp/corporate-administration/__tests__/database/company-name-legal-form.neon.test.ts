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
import {
	caCompanyLegalFormHistory,
	caCompanyName,
	db,
	eq,
	sql,
} from "@afenda/db";
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

async function countNames(organizationId: string): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caCompanyName)
		.where(eq(caCompanyName.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

async function countLegalForms(organizationId: string): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caCompanyLegalFormHistory)
		.where(eq(caCompanyLegalFormHistory.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`company name and legal-form Neon parity (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("persists name, legal form, audit and outbox facts durably", async () => {
			const organizationId = `org-ca-name-form-${randomUUID()}`;
			const dependencies = createHistoryDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-name-form" }),
					options,
					dependencies,
				);
				expectOk(registered);
				const jurisdiction = await setCompanyJurisdictionProfile(
					caJurisdictionProfileInput({
						legalCompanyId: registered.data.legalCompanyId,
						expectedCompanyVersion: registered.data.version,
					}),
					{ ...options, idempotencyKey: "idem-name-form-jurisdiction" },
					dependencies,
				);
				expectOk(jurisdiction);
				const name = await addCompanyName(
					{
						legalCompanyId: registered.data.legalCompanyId,
						nameType: "legal",
						languageCode: "en",
						displayName: "Café Holdings",
						effectiveFrom: "2024-01-01",
						effectiveTo: null,
						sourceDocumentId: "doc:name:1",
						expectedCompanyVersion: registered.data.version + 1,
					},
					{ ...options, idempotencyKey: "idem-name-form-name" },
					dependencies,
				);
				expectOk(name);
				const legalForm = await setCompanyLegalForm(
					{
						legalCompanyId: registered.data.legalCompanyId,
						legalFormCode: "private_limited_company",
						jurisdictionCode: "MY",
						entityTypeCode: "private_limited_company",
						effectiveFrom: "2024-01-01",
						effectiveTo: null,
						sourceDocumentId: "doc:form:1",
						expectedCompanyVersion: registered.data.version + 2,
					},
					{ ...options, idempotencyKey: "idem-name-form-form" },
					dependencies,
				);
				expectOk(legalForm);

				await expect(countNames(organizationId)).resolves.toBe(1);
				await expect(countLegalForms(organizationId)).resolves.toBe(1);
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
