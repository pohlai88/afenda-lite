import { randomUUID } from "node:crypto";

import {
	defineStatutoryOffice,
	registerLegalCompanyDraft,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationOfficerStore } from "@afenda/corporate-administration/adapters/drizzle";
import { database as afendaDatabase } from "@afenda/db";
import { describe, expect, it } from "vitest";

import {
	caCommandOptions,
	caDraftInput,
	createDrizzleCompanyDependencies,
	expectOk,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationOfficerTestData,
	countCorporateAdministrationMutationReceiptsByStatus,
	countCorporateAdministrationOutboxEvents,
	countCorporateAdministrationStatutoryOffices,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const DEFINE_STATUTORY_OFFICE_COMMAND_ID =
	"corporate-administration.statutory-office.define";

function createOfficerDependencies() {
	const base = createDrizzleCompanyDependencies();
	return {
		...base,
		companyStore: base.store,
		officerStore: createDrizzleCorporateAdministrationOfficerStore({
			database: afendaDatabase.client,
			createId: randomUUID,
		}),
		referenceData: {
			validateSourceDocument: base.referenceData.validateSourceDocument,
		},
		partyReferences: base.partyReferences,
	};
}

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`statutory office atomicity (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rolls back statutory office, completed receipt, and outbox rows when event append fails", async () => {
			const organizationId = `org-ca-officer-atomic-${randomUUID()}`;
			const dependencies = createOfficerDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-officer-atomic" }),
					options,
					dependencies,
				);
				expectOk(company);
				const beforeOutbox =
					await countCorporateAdministrationOutboxEvents(organizationId);

				const result = await defineStatutoryOffice(
					{
						legalCompanyId: company.data.legalCompanyId,
						officeTypeCode: "DIRECTOR",
						jurisdictionCode: "MY",
						displayName: "Director",
						description: null,
						required: true,
						minimumHolders: 1,
						maximumHolders: 5,
						vacancyGraceDays: 30,
						protectedRole: false,
						effectiveFrom: "2026-01-01",
						sourceDocumentId: "doc:officer:atomic",
						expectedCompanyVersion: company.data.version,
					},
					{ ...options, idempotencyKey: "idem-officer-atomic" },
					{
						...dependencies,
						runtime: {
							...dependencies.runtime,
							outbox: {
								append: async () => ({
									ok: false,
									code: "SERVICE_UNAVAILABLE",
									message: "Injected outbox failure.",
								}),
							},
						},
					},
				);

				expect(result.ok).toBe(false);
				await expect(
					countCorporateAdministrationStatutoryOffices(organizationId),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						{
							organizationId,
							commandId: DEFINE_STATUTORY_OFFICE_COMMAND_ID,
							idempotencyKey: "idem-officer-atomic",
						},
						"completed",
					),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						{
							organizationId,
							commandId: DEFINE_STATUTORY_OFFICE_COMMAND_ID,
							idempotencyKey: "idem-officer-atomic",
						},
						"released",
					),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(beforeOutbox);
			} finally {
				await cleanupCorporateAdministrationOfficerTestData(organizationId);
			}
		});
	},
);
