import {
	createGovernanceBody,
	defineStatutoryOffice,
	recordWrittenResolution,
	registerLegalCompanyDraft,
	registerLegalEstablishment,
	scheduleGovernanceMeeting,
	updateLegalEstablishment,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";

import {
	CA_APP_01_TEXT_DIGEST,
	createCaApp01EstablishmentDependencies,
	createCaApp01GovernanceDependencies,
	createCaApp01MeetingDependencies,
	createCaApp01OfficerDependencies,
	createCaApp01ResolutionDependencies,
} from "../helpers/ca-app-01-neon-deps";
import {
	caCommandOptions,
	caDraftInput,
	expectOk,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationEstablishmentTestData,
	cleanupCorporateAdministrationGovernanceTestData,
	cleanupCorporateAdministrationMeetingTestData,
	cleanupCorporateAdministrationOfficerTestData,
	cleanupCorporateAdministrationResolutionTestData,
	countCorporateAdministrationGovernanceBodies,
	countCorporateAdministrationGovernanceMeetings,
	countCorporateAdministrationLegalEstablishments,
	countCorporateAdministrationResolutions,
	countCorporateAdministrationStatutoryOffices,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`CA-APP-01 idempotency replay (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("replays establishment registration and rejects fingerprint reuse", async () => {
			const organizationId = uniqueCaOrganizationId("est-replay");
			const dependencies = createCaApp01EstablishmentDependencies();
			const options = caCommandOptions({
				organizationId,
				idempotencyKey: "idem-est-replay",
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-est-replay" }),
					{ ...options, idempotencyKey: "idem-est-company" },
					dependencies,
				);
				expectOk(company);
				const input = {
					legalCompanyId: company.data.legalCompanyId,
					establishmentType: "branch" as const,
					jurisdictionCode: "MY",
					registrationIdentifier: "BR-2026-REPLAY",
					displayName: "Replay Branch",
					registeredFrom: "2026-08-01",
					sourceDocumentId: "doc:est:replay",
					expectedCompanyVersion: company.data.version,
				};

				const first = await registerLegalEstablishment(
					input,
					options,
					dependencies,
				);
				expectOk(first);
				const replay = await registerLegalEstablishment(
					input,
					options,
					dependencies,
				);
				expect(replay).toEqual(first);
				const conflict = await registerLegalEstablishment(
					{ ...input, displayName: "Different Branch Name" },
					options,
					dependencies,
				);
				expect(conflict).toMatchObject({
					ok: false,
					code: "CONFLICT",
				});
				await expect(
					countCorporateAdministrationLegalEstablishments(organizationId),
				).resolves.toBe(1);

				const stale = await updateLegalEstablishment(
					{
						legalEstablishmentId: first.data.id,
						displayName: "Stale Update",
						sourceDocumentId: "doc:est:stale",
						expectedVersion: first.data.version + 10,
					},
					{ ...options, idempotencyKey: "idem-est-stale" },
					dependencies,
				);
				expect(stale).toMatchObject({ ok: false, code: "CONFLICT" });
			} finally {
				await cleanupCorporateAdministrationEstablishmentTestData(
					organizationId,
				);
			}
		});

		it("replays governance body create and rejects fingerprint reuse", async () => {
			const organizationId = uniqueCaOrganizationId("gov-replay");
			const dependencies = createCaApp01GovernanceDependencies();
			const options = caCommandOptions({
				organizationId,
				idempotencyKey: "idem-gov-replay",
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-gov-replay" }),
					{ ...options, idempotencyKey: "idem-gov-company" },
					dependencies,
				);
				expectOk(company);
				const input = {
					legalCompanyId: company.data.legalCompanyId,
					bodyType: "board" as const,
					bodyCode: "BOARD",
					displayName: "Board of Directors",
					description: null,
					effectiveFrom: "2026-01-01",
					sourceDocumentId: "doc:gov:replay",
					expectedCompanyVersion: company.data.version,
				};

				const first = await createGovernanceBody(input, options, dependencies);
				expectOk(first);
				const replay = await createGovernanceBody(input, options, dependencies);
				expect(replay).toEqual(first);
				const conflict = await createGovernanceBody(
					{ ...input, displayName: "Different Board Name" },
					options,
					dependencies,
				);
				expect(conflict).toMatchObject({ ok: false, code: "CONFLICT" });
				await expect(
					countCorporateAdministrationGovernanceBodies(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationGovernanceTestData(organizationId);
			}
		});

		it("replays statutory office define and rejects fingerprint reuse", async () => {
			const organizationId = uniqueCaOrganizationId("off-replay");
			const dependencies = createCaApp01OfficerDependencies();
			const options = caCommandOptions({
				organizationId,
				idempotencyKey: "idem-off-replay",
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-off-replay" }),
					{ ...options, idempotencyKey: "idem-off-company" },
					dependencies,
				);
				expectOk(company);
				const input = {
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
					sourceDocumentId: "doc:off:replay",
					expectedCompanyVersion: company.data.version,
				};

				const first = await defineStatutoryOffice(input, options, dependencies);
				expectOk(first);
				const replay = await defineStatutoryOffice(
					input,
					options,
					dependencies,
				);
				expect(replay).toEqual(first);
				const conflict = await defineStatutoryOffice(
					{ ...input, displayName: "Different Director Label" },
					options,
					dependencies,
				);
				expect(conflict).toMatchObject({ ok: false, code: "CONFLICT" });
				await expect(
					countCorporateAdministrationStatutoryOffices(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationOfficerTestData(organizationId);
			}
		});

		it("replays meeting schedule and rejects fingerprint reuse", async () => {
			const organizationId = uniqueCaOrganizationId("mtg-replay");
			const dependencies = createCaApp01MeetingDependencies();
			const options = caCommandOptions({
				organizationId,
				idempotencyKey: "idem-mtg-replay",
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-mtg-replay" }),
					{ ...options, idempotencyKey: "idem-mtg-company" },
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
						sourceDocumentId: "doc:mtg:body",
						expectedCompanyVersion: company.data.version,
					},
					{ ...options, idempotencyKey: "idem-mtg-body" },
					dependencies,
				);
				expectOk(body);
				const input = {
					legalCompanyId: company.data.legalCompanyId,
					governanceBodyId: body.data.id,
					procedureType: "hybrid" as const,
					title: "Replay board meeting",
					scheduledStartAt: "2026-04-10T09:00:00.000Z",
					scheduledEndAt: "2026-04-10T10:00:00.000Z",
					noticePeriodDays: 5,
					locationSummary: "Board room",
					remoteAccessSummary: "Video conference",
					sourceDocumentId: "doc:mtg:replay",
					expectedBodyVersion: body.data.version,
				};

				const first = await scheduleGovernanceMeeting(
					input,
					options,
					dependencies,
				);
				expectOk(first);
				const replay = await scheduleGovernanceMeeting(
					input,
					options,
					dependencies,
				);
				expect(replay).toEqual(first);
				const conflict = await scheduleGovernanceMeeting(
					{ ...input, title: "Different meeting title" },
					options,
					dependencies,
				);
				expect(conflict).toMatchObject({ ok: false, code: "CONFLICT" });
				await expect(
					countCorporateAdministrationGovernanceMeetings(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationMeetingTestData(organizationId);
			}
		});

		it("replays written resolution and rejects fingerprint reuse", async () => {
			const organizationId = uniqueCaOrganizationId("res-replay");
			const dependencies = createCaApp01ResolutionDependencies();
			const options = caCommandOptions({
				organizationId,
				idempotencyKey: "idem-res-replay",
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-res-replay" }),
					{ ...options, idempotencyKey: "idem-res-company" },
					dependencies,
				);
				expectOk(company);
				const input = {
					legalCompanyId: company.data.legalCompanyId,
					resolutionCode: "WR-REPLAY-001",
					title: "Replay written resolution",
					textDigest: CA_APP_01_TEXT_DIGEST,
					documentId: "doc:res:text",
					effectiveFrom: "2026-05-01",
					approvedAt: "2026-05-01T10:00:00.000Z",
					eligibleVotes: 3,
					votesFor: 3,
					thresholdType: "unanimous" as const,
					sourceDocumentId: "doc:res:replay",
				};

				const first = await recordWrittenResolution(
					input,
					options,
					dependencies,
				);
				expectOk(first);
				const replay = await recordWrittenResolution(
					input,
					options,
					dependencies,
				);
				expect(replay).toEqual(first);
				const conflict = await recordWrittenResolution(
					{ ...input, title: "Different resolution title" },
					options,
					dependencies,
				);
				expect(conflict).toMatchObject({ ok: false, code: "CONFLICT" });
				await expect(
					countCorporateAdministrationResolutions(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationResolutionTestData(organizationId);
			}
		});
	},
);
