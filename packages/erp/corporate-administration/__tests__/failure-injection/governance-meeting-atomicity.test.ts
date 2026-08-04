import { randomUUID } from "node:crypto";

import {
	createGovernanceBody,
	registerLegalCompanyDraft,
	scheduleGovernanceMeeting,
} from "@afenda/corporate-administration";
import {
	createDrizzleCorporateAdministrationGovernanceStore,
	createDrizzleCorporateAdministrationMeetingStore,
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
	cleanupCorporateAdministrationMeetingTestData,
	countCorporateAdministrationGovernanceMeetings,
	countCorporateAdministrationMutationReceiptsByStatus,
	countCorporateAdministrationOutboxEvents,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const SCHEDULE_MEETING_COMMAND_ID = "corporate-administration.meeting.schedule";

function createMeetingDependencies() {
	const base = createDrizzleCompanyDependencies();
	const governanceStore = createDrizzleCorporateAdministrationGovernanceStore({
		database: afendaDatabase.client,
		createId: randomUUID,
	});
	return {
		...base,
		companyStore: base.store,
		governanceStore,
		meetingStore: createDrizzleCorporateAdministrationMeetingStore({
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
	`governance meeting atomicity (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rolls back meeting, completed receipt, and outbox rows when event append fails", async () => {
			const organizationId = `org-ca-meeting-atomic-${randomUUID()}`;
			const dependencies = createMeetingDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-meeting-atomic" }),
					options,
					dependencies,
				);
				expectOk(company);
				const body = await createGovernanceBody(
					{
						legalCompanyId: company.data.legalCompanyId,
						bodyType: "board",
						bodyCode: "BOARD",
						displayName: "Board of Directors",
						description: null,
						effectiveFrom: "2026-01-01",
						sourceDocumentId: "doc:meeting:body",
						expectedCompanyVersion: company.data.version,
					},
					{ ...options, idempotencyKey: "idem-meeting-body" },
					dependencies,
				);
				expectOk(body);
				const beforeOutbox =
					await countCorporateAdministrationOutboxEvents(organizationId);

				const result = await scheduleGovernanceMeeting(
					{
						legalCompanyId: company.data.legalCompanyId,
						governanceBodyId: body.data.id,
						procedureType: "hybrid",
						title: "Atomicity board meeting",
						scheduledStartAt: "2026-04-10T09:00:00.000Z",
						scheduledEndAt: "2026-04-10T10:00:00.000Z",
						noticePeriodDays: 5,
						locationSummary: "Board room",
						remoteAccessSummary: null,
						sourceDocumentId: "doc:meeting:atomic",
						expectedBodyVersion: body.data.version,
					},
					{ ...options, idempotencyKey: "idem-meeting-atomic" },
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
					countCorporateAdministrationGovernanceMeetings(organizationId),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						{
							organizationId,
							commandId: SCHEDULE_MEETING_COMMAND_ID,
							idempotencyKey: "idem-meeting-atomic",
						},
						"completed",
					),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						{
							organizationId,
							commandId: SCHEDULE_MEETING_COMMAND_ID,
							idempotencyKey: "idem-meeting-atomic",
						},
						"released",
					),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(beforeOutbox);
			} finally {
				await cleanupCorporateAdministrationMeetingTestData(organizationId);
			}
		});
	},
);
