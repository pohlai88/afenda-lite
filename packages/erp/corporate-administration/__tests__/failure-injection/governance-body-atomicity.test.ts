import { randomUUID } from "node:crypto";

import {
	createGovernanceBody,
	registerLegalCompanyDraft,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationGovernanceStore } from "@afenda/corporate-administration/adapters/drizzle";
import { database as afendaDatabase } from "@afenda/db";
import { describe, expect, it } from "vitest";

import {
	caCommandOptions,
	caDraftInput,
	createDrizzleCompanyDependencies,
	expectOk,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationGovernanceTestData,
	countCorporateAdministrationGovernanceBodies,
	countCorporateAdministrationMutationReceiptsByStatus,
	countCorporateAdministrationOutboxEvents,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const CREATE_GOVERNANCE_BODY_COMMAND_ID =
	"corporate-administration.governance-body.create";

function createGovernanceDependencies() {
	const base = createDrizzleCompanyDependencies();
	return {
		...base,
		companyStore: base.store,
		governanceStore: createDrizzleCorporateAdministrationGovernanceStore({
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
	`governance body atomicity (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rolls back governance body, completed receipt, and outbox rows when event append fails", async () => {
			const organizationId = `org-ca-governance-atomic-${randomUUID()}`;
			const dependencies = createGovernanceDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-governance-atomic" }),
					options,
					dependencies,
				);
				expectOk(company);
				const beforeOutbox =
					await countCorporateAdministrationOutboxEvents(organizationId);

				const result = await createGovernanceBody(
					{
						legalCompanyId: company.data.legalCompanyId,
						bodyType: "board",
						bodyCode: "BOARD",
						displayName: "Board of Directors",
						description: null,
						effectiveFrom: "2026-01-01",
						sourceDocumentId: "doc:governance:atomic",
						expectedCompanyVersion: company.data.version,
					},
					{ ...options, idempotencyKey: "idem-governance-atomic" },
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
					countCorporateAdministrationGovernanceBodies(organizationId),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						{
							organizationId,
							commandId: CREATE_GOVERNANCE_BODY_COMMAND_ID,
							idempotencyKey: "idem-governance-atomic",
						},
						"completed",
					),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						{
							organizationId,
							commandId: CREATE_GOVERNANCE_BODY_COMMAND_ID,
							idempotencyKey: "idem-governance-atomic",
						},
						"released",
					),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(beforeOutbox);
			} finally {
				await cleanupCorporateAdministrationGovernanceTestData(organizationId);
			}
		});
	},
);
