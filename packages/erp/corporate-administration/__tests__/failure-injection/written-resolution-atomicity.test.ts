import { randomUUID } from "node:crypto";

import {
	recordWrittenResolution,
	registerLegalCompanyDraft,
} from "@afenda/corporate-administration";
import {
	createDrizzleCorporateAdministrationMeetingStore,
	createDrizzleCorporateAdministrationResolutionStore,
} from "@afenda/corporate-administration/adapters/drizzle";
import { database as afendaDatabase } from "@afenda/db";
import { describe, expect, it } from "vitest";

import {
	caCommandOptions,
	caDraftInput,
	createDrizzleCompanyDependencies,
	expectOk,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationResolutionTestData,
	countCorporateAdministrationMutationReceiptsByStatus,
	countCorporateAdministrationOutboxEvents,
	countCorporateAdministrationResolutions,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const RECORD_WRITTEN_RESOLUTION_COMMAND_ID =
	"corporate-administration.resolution.record-written";

const TEXT_DIGEST =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function createResolutionDependencies() {
	const base = createDrizzleCompanyDependencies();
	return {
		...base,
		meetingStore: createDrizzleCorporateAdministrationMeetingStore({
			database: afendaDatabase.client,
			createId: randomUUID,
		}),
		resolutionStore: createDrizzleCorporateAdministrationResolutionStore({
			database: afendaDatabase.client,
			createId: randomUUID,
		}),
		referenceData: {
			...base.referenceData,
			validateSourceDocument: base.referenceData.validateSourceDocument,
		},
	};
}

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`written resolution atomicity (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rolls back resolution, completed receipt, and outbox rows when event append fails", async () => {
			const organizationId = `org-ca-resolution-atomic-${randomUUID()}`;
			const dependencies = createResolutionDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-resolution-atomic" }),
					options,
					dependencies,
				);
				expectOk(company);
				const beforeOutbox =
					await countCorporateAdministrationOutboxEvents(organizationId);

				const result = await recordWrittenResolution(
					{
						legalCompanyId: company.data.legalCompanyId,
						resolutionCode: "WR-ATOMIC-001",
						title: "Atomic written resolution",
						textDigest: TEXT_DIGEST,
						documentId: "doc:resolution:text",
						effectiveFrom: "2026-05-01",
						approvedAt: "2026-05-01T10:00:00.000Z",
						eligibleVotes: 3,
						votesFor: 3,
						thresholdType: "unanimous",
						sourceDocumentId: "doc:resolution:atomic",
					},
					{ ...options, idempotencyKey: "idem-resolution-atomic" },
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
					countCorporateAdministrationResolutions(organizationId),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						{
							organizationId,
							commandId: RECORD_WRITTEN_RESOLUTION_COMMAND_ID,
							idempotencyKey: "idem-resolution-atomic",
						},
						"completed",
					),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						{
							organizationId,
							commandId: RECORD_WRITTEN_RESOLUTION_COMMAND_ID,
							idempotencyKey: "idem-resolution-atomic",
						},
						"released",
					),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(beforeOutbox);
			} finally {
				await cleanupCorporateAdministrationResolutionTestData(organizationId);
			}
		});
	},
);
