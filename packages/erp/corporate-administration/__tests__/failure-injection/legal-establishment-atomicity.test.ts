import { randomUUID } from "node:crypto";

import {
	registerLegalCompanyDraft,
	registerLegalEstablishment,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationEstablishmentStore } from "@afenda/corporate-administration/adapters/drizzle";
import { database as afendaDatabase } from "@afenda/db";
import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";

import {
	caCommandOptions,
	caDraftInput,
	createDrizzleCompanyDependencies,
	expectOk,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationEstablishmentTestData,
	countCorporateAdministrationLegalEstablishments,
	countCorporateAdministrationMutationReceiptsByStatus,
	countCorporateAdministrationOutboxEvents,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const REGISTER_ESTABLISHMENT_COMMAND_ID =
	"corporate-administration.legal-establishment.register";

function createEstablishmentDependencies() {
	const base = createDrizzleCompanyDependencies();
	return {
		...base,
		companyStore: base.store,
		establishmentStore: createDrizzleCorporateAdministrationEstablishmentStore({
			database: afendaDatabase.client,
			createId: randomUUID,
		}),
		addressReferences: {
			getPartyAddress: async () => errorResult.ok(null),
		},
	};
}

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`legal establishment atomicity (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rolls back establishment, completed receipt, and outbox rows when event append fails", async () => {
			const organizationId = `org-ca-establishment-atomic-${randomUUID()}`;
			const dependencies = createEstablishmentDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-establishment-atomic" }),
					options,
					dependencies,
				);
				expectOk(company);
				const beforeOutbox =
					await countCorporateAdministrationOutboxEvents(organizationId);

				const result = await registerLegalEstablishment(
					{
						legalCompanyId: company.data.legalCompanyId,
						establishmentType: "branch",
						jurisdictionCode: "MY",
						registrationIdentifier: "BR-2026-ATOMIC",
						displayName: "Atomicity Branch",
						registeredFrom: "2026-08-01",
						sourceDocumentId: "doc:establishment:atomic",
						expectedCompanyVersion: company.data.version,
					},
					{ ...options, idempotencyKey: "idem-establishment-atomic" },
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
					countCorporateAdministrationLegalEstablishments(organizationId),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						{
							organizationId,
							commandId: REGISTER_ESTABLISHMENT_COMMAND_ID,
							idempotencyKey: "idem-establishment-atomic",
						},
						"completed",
					),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						{
							organizationId,
							commandId: REGISTER_ESTABLISHMENT_COMMAND_ID,
							idempotencyKey: "idem-establishment-atomic",
						},
						"released",
					),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(beforeOutbox);
			} finally {
				await cleanupCorporateAdministrationEstablishmentTestData(
					organizationId,
				);
			}
		});
	},
);
