import { randomUUID } from "node:crypto";

import {
	amendGovernanceBody,
	createGovernanceBody,
	defineStatutoryOffice,
	getGovernanceBody,
	getGovernanceMeeting,
	getLegalCompany,
	getLegalEstablishment,
	getOfficerVacancyStatus,
	getResolution,
	listGovernanceBodiesAsOf,
	listLegalEstablishmentsAsOf,
	listOfficersAsOf,
	recordWrittenResolution,
	registerLegalCompanyDraft,
	registerLegalEstablishment,
	scheduleGovernanceMeeting,
	updateLegalEstablishment,
} from "@afenda/corporate-administration";
import {
	createDrizzleCorporateAdministrationEstablishmentStore,
	createDrizzleCorporateAdministrationGovernanceStore,
	createDrizzleCorporateAdministrationMeetingStore,
	createDrizzleCorporateAdministrationOfficerStore,
	createDrizzleCorporateAdministrationResolutionStore,
} from "@afenda/corporate-administration/adapters/drizzle";
import { database as afendaDatabase } from "@afenda/db";
import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";

import {
	caCommandOptions,
	caDraftInput,
	caQueryOptions,
	createDrizzleCompanyDependencies,
	expectOk,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationEstablishmentTestData,
	cleanupCorporateAdministrationGovernanceTestData,
	cleanupCorporateAdministrationMeetingTestData,
	cleanupCorporateAdministrationOfficerTestData,
	cleanupCorporateAdministrationResolutionTestData,
	countCorporateAdministrationMutationReceipts,
	countCorporateAdministrationOutboxEvents,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const TEXT_DIGEST =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

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
	`CA-APP-01 cohort tenant isolation (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rejects cross-organization establishment reads and writes without disclosing the owner row", async () => {
			const ownerOrganizationId = uniqueCaOrganizationId("est-tenant-owner");
			const attackerOrganizationId = uniqueCaOrganizationId(
				"est-tenant-attacker",
			);
			const dependencies = createEstablishmentDependencies();
			const ownerOptions = caCommandOptions({
				organizationId: ownerOrganizationId,
			});
			const attackerOptions = caCommandOptions({
				organizationId: attackerOrganizationId,
				idempotencyKey: `idem-est-attacker-${randomUUID()}`,
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-est-tenant" }),
					ownerOptions,
					dependencies,
				);
				expectOk(company);
				const establishment = await registerLegalEstablishment(
					{
						legalCompanyId: company.data.legalCompanyId,
						establishmentType: "branch",
						jurisdictionCode: "MY",
						registrationIdentifier: "BR-TENANT-001",
						displayName: "Tenant Branch",
						registeredFrom: "2026-08-01",
						sourceDocumentId: "doc:est:tenant",
						expectedCompanyVersion: company.data.version,
					},
					{ ...ownerOptions, idempotencyKey: "idem-est-owner" },
					dependencies,
				);
				expectOk(establishment);

				const crossRead = await getLegalEstablishment(
					{ legalEstablishmentId: establishment.data.id },
					caQueryOptions({ organizationId: attackerOrganizationId }),
					dependencies,
				);
				expect(crossRead).toMatchObject({ ok: false, code: "NOT_FOUND" });

				const crossWrite = await updateLegalEstablishment(
					{
						legalEstablishmentId: establishment.data.id,
						displayName: "Hostile rename",
						sourceDocumentId: "doc:est:hostile",
						expectedVersion: establishment.data.version,
					},
					attackerOptions,
					dependencies,
				);
				expect(crossWrite).toMatchObject({ ok: false, code: "NOT_FOUND" });
				await expect(
					countCorporateAdministrationMutationReceipts({
						organizationId: attackerOrganizationId,
						commandId: "corporate-administration.legal-establishment.update",
						idempotencyKey: attackerOptions.idempotencyKey,
					}),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationOutboxEvents(attackerOrganizationId),
				).resolves.toBe(0);
			} finally {
				await cleanupCorporateAdministrationEstablishmentTestData(
					attackerOrganizationId,
				);
				await cleanupCorporateAdministrationEstablishmentTestData(
					ownerOrganizationId,
				);
			}
		});

		it("rejects cross-organization governance reads and writes without disclosing the owner row", async () => {
			const ownerOrganizationId = uniqueCaOrganizationId("gov-tenant-owner");
			const attackerOrganizationId = uniqueCaOrganizationId(
				"gov-tenant-attacker",
			);
			const dependencies = createGovernanceDependencies();
			const ownerOptions = caCommandOptions({
				organizationId: ownerOrganizationId,
			});
			const attackerOptions = caCommandOptions({
				organizationId: attackerOrganizationId,
				idempotencyKey: `idem-gov-attacker-${randomUUID()}`,
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-gov-tenant" }),
					ownerOptions,
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
						sourceDocumentId: "doc:gov:tenant",
						expectedCompanyVersion: company.data.version,
					},
					{ ...ownerOptions, idempotencyKey: "idem-gov-owner" },
					dependencies,
				);
				expectOk(body);

				const crossRead = await getGovernanceBody(
					{ governanceBodyId: body.data.id },
					caQueryOptions({ organizationId: attackerOrganizationId }),
					dependencies,
				);
				expect(crossRead).toMatchObject({ ok: false, code: "NOT_FOUND" });

				const crossWrite = await amendGovernanceBody(
					{
						governanceBodyId: body.data.id,
						displayName: "Hostile Board",
						description: null,
						sourceDocumentId: "doc:gov:hostile",
						expectedVersion: body.data.version,
					},
					attackerOptions,
					dependencies,
				);
				expect(crossWrite).toMatchObject({ ok: false, code: "NOT_FOUND" });
				await expect(
					countCorporateAdministrationMutationReceipts({
						organizationId: attackerOrganizationId,
						commandId: "corporate-administration.governance-body.amend",
						idempotencyKey: attackerOptions.idempotencyKey,
					}),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationOutboxEvents(attackerOrganizationId),
				).resolves.toBe(0);
			} finally {
				await cleanupCorporateAdministrationGovernanceTestData(
					attackerOrganizationId,
				);
				await cleanupCorporateAdministrationGovernanceTestData(
					ownerOrganizationId,
				);
			}
		});

		it("rejects cross-organization officer reads and writes without disclosing the owner row", async () => {
			const ownerOrganizationId = uniqueCaOrganizationId("off-tenant-owner");
			const attackerOrganizationId = uniqueCaOrganizationId(
				"off-tenant-attacker",
			);
			const dependencies = createOfficerDependencies();
			const ownerOptions = caCommandOptions({
				organizationId: ownerOrganizationId,
			});
			const attackerOptions = caCommandOptions({
				organizationId: attackerOrganizationId,
				idempotencyKey: `idem-off-attacker-${randomUUID()}`,
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-off-tenant" }),
					ownerOptions,
					dependencies,
				);
				expectOk(company);
				const office = await defineStatutoryOffice(
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
						sourceDocumentId: "doc:off:tenant",
						expectedCompanyVersion: company.data.version,
					},
					{ ...ownerOptions, idempotencyKey: "idem-off-owner" },
					dependencies,
				);
				expectOk(office);

				const crossVacancy = await getOfficerVacancyStatus(
					{
						statutoryOfficeId: office.data.id,
						asOf: "2026-06-01",
					},
					caQueryOptions({ organizationId: attackerOrganizationId }),
					dependencies,
				);
				expect(crossVacancy).toMatchObject({ ok: false, code: "NOT_FOUND" });

				const crossList = await listOfficersAsOf(
					{
						legalCompanyId: company.data.legalCompanyId,
						asOf: "2026-06-01",
						statutoryOfficeId: office.data.id,
					},
					caQueryOptions({ organizationId: attackerOrganizationId }),
					dependencies,
				);
				expect(crossList).toMatchObject({
					ok: true,
					data: { items: [], nextCursor: null },
				});

				const crossWrite = await defineStatutoryOffice(
					{
						legalCompanyId: company.data.legalCompanyId,
						officeTypeCode: "SECRETARY",
						jurisdictionCode: "MY",
						displayName: "Hostile Secretary",
						description: null,
						required: false,
						minimumHolders: 1,
						maximumHolders: 1,
						vacancyGraceDays: 0,
						protectedRole: false,
						effectiveFrom: "2026-01-01",
						sourceDocumentId: "doc:off:hostile",
						expectedCompanyVersion: company.data.version,
					},
					attackerOptions,
					dependencies,
				);
				expect(crossWrite).toMatchObject({ ok: false, code: "NOT_FOUND" });
				await expect(
					countCorporateAdministrationMutationReceipts({
						organizationId: attackerOrganizationId,
						commandId: "corporate-administration.statutory-office.define",
						idempotencyKey: attackerOptions.idempotencyKey,
					}),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationOutboxEvents(attackerOrganizationId),
				).resolves.toBe(0);
			} finally {
				await cleanupCorporateAdministrationOfficerTestData(
					attackerOrganizationId,
				);
				await cleanupCorporateAdministrationOfficerTestData(
					ownerOrganizationId,
				);
			}
		});

		it("rejects cross-organization meeting reads without disclosing the owner row", async () => {
			const ownerOrganizationId = uniqueCaOrganizationId("mtg-tenant-owner");
			const attackerOrganizationId = uniqueCaOrganizationId(
				"mtg-tenant-attacker",
			);
			const dependencies = createMeetingDependencies();
			const ownerOptions = caCommandOptions({
				organizationId: ownerOrganizationId,
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-mtg-tenant" }),
					ownerOptions,
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
					{ ...ownerOptions, idempotencyKey: "idem-mtg-body" },
					dependencies,
				);
				expectOk(body);
				const meeting = await scheduleGovernanceMeeting(
					{
						legalCompanyId: company.data.legalCompanyId,
						governanceBodyId: body.data.id,
						procedureType: "hybrid",
						title: "Tenant isolation meeting",
						scheduledStartAt: "2026-04-10T09:00:00.000Z",
						scheduledEndAt: "2026-04-10T10:00:00.000Z",
						noticePeriodDays: 5,
						locationSummary: "Board room",
						remoteAccessSummary: "Video conference",
						sourceDocumentId: "doc:mtg:tenant",
						expectedBodyVersion: body.data.version,
					},
					{ ...ownerOptions, idempotencyKey: "idem-mtg-owner" },
					dependencies,
				);
				expectOk(meeting);

				const crossRead = await getGovernanceMeeting(
					{ governanceMeetingId: meeting.data.id },
					caQueryOptions({ organizationId: attackerOrganizationId }),
					dependencies,
				);
				expect(crossRead).toEqual({ ok: true, data: null });
				await expect(
					countCorporateAdministrationOutboxEvents(attackerOrganizationId),
				).resolves.toBe(0);
			} finally {
				await cleanupCorporateAdministrationMeetingTestData(
					attackerOrganizationId,
				);
				await cleanupCorporateAdministrationMeetingTestData(
					ownerOrganizationId,
				);
			}
		});

		it("rejects cross-organization resolution reads without disclosing the owner row", async () => {
			const ownerOrganizationId = uniqueCaOrganizationId("res-tenant-owner");
			const attackerOrganizationId = uniqueCaOrganizationId(
				"res-tenant-attacker",
			);
			const dependencies = createResolutionDependencies();
			const ownerOptions = caCommandOptions({
				organizationId: ownerOrganizationId,
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-res-tenant" }),
					ownerOptions,
					dependencies,
				);
				expectOk(company);
				const resolution = await recordWrittenResolution(
					{
						legalCompanyId: company.data.legalCompanyId,
						resolutionCode: "WR-TENANT-001",
						title: "Tenant isolation written resolution",
						textDigest: TEXT_DIGEST,
						documentId: "doc:res:text",
						effectiveFrom: "2026-05-01",
						approvedAt: "2026-05-01T10:00:00.000Z",
						eligibleVotes: 3,
						votesFor: 3,
						thresholdType: "unanimous",
						sourceDocumentId: "doc:res:tenant",
					},
					{ ...ownerOptions, idempotencyKey: "idem-res-owner" },
					dependencies,
				);
				expectOk(resolution);

				const crossRead = await getResolution(
					{ resolutionId: resolution.data.id },
					caQueryOptions({ organizationId: attackerOrganizationId }),
					dependencies,
				);
				expect(crossRead).toEqual({ ok: true, data: null });
				await expect(
					countCorporateAdministrationOutboxEvents(attackerOrganizationId),
				).resolves.toBe(0);
			} finally {
				await cleanupCorporateAdministrationResolutionTestData(
					attackerOrganizationId,
				);
				await cleanupCorporateAdministrationResolutionTestData(
					ownerOrganizationId,
				);
			}
		});

		it("rejects cross-organization list and cursor reuse for establishments and governance bodies", async () => {
			const ownerOrganizationId = uniqueCaOrganizationId("list-tenant-owner");
			const attackerOrganizationId = uniqueCaOrganizationId(
				"list-tenant-attacker",
			);
			const establishmentDependencies = createEstablishmentDependencies();
			const governanceDependencies = createGovernanceDependencies();
			const ownerOptions = caCommandOptions({
				organizationId: ownerOrganizationId,
			});
			const ownerQuery = caQueryOptions({
				organizationId: ownerOrganizationId,
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-list-tenant" }),
					ownerOptions,
					establishmentDependencies,
				);
				expectOk(company);

				const first = await registerLegalEstablishment(
					{
						legalCompanyId: company.data.legalCompanyId,
						establishmentType: "branch",
						jurisdictionCode: "MY",
						registrationIdentifier: "BR-LIST-001",
						displayName: "List Branch One",
						registeredFrom: "2026-08-01",
						sourceDocumentId: "doc:list:est-1",
						expectedCompanyVersion: company.data.version,
					},
					{ ...ownerOptions, idempotencyKey: "idem-list-est-1" },
					establishmentDependencies,
				);
				expectOk(first);

				const companyAfterFirst = await getLegalCompany(
					{ legalCompanyId: company.data.legalCompanyId },
					ownerQuery,
					establishmentDependencies,
				);
				expectOk(companyAfterFirst);

				const second = await registerLegalEstablishment(
					{
						legalCompanyId: company.data.legalCompanyId,
						establishmentType: "branch",
						jurisdictionCode: "MY",
						registrationIdentifier: "BR-LIST-002",
						displayName: "List Branch Two",
						registeredFrom: "2026-08-02",
						sourceDocumentId: "doc:list:est-2",
						expectedCompanyVersion: companyAfterFirst.data.version,
					},
					{ ...ownerOptions, idempotencyKey: "idem-list-est-2" },
					establishmentDependencies,
				);
				expectOk(second);

				const ownerPage = await listLegalEstablishmentsAsOf(
					{
						legalCompanyId: company.data.legalCompanyId,
						asOf: "2026-08-15",
						pagination: { limit: 1 },
					},
					ownerQuery,
					establishmentDependencies,
				);
				expectOk(ownerPage);
				expect(ownerPage.data.nextCursor).not.toBeNull();

				const crossList = await listLegalEstablishmentsAsOf(
					{
						legalCompanyId: company.data.legalCompanyId,
						asOf: "2026-08-15",
						pagination: { limit: 10 },
					},
					caQueryOptions({ organizationId: attackerOrganizationId }),
					establishmentDependencies,
				);
				expect(crossList).toMatchObject({
					ok: true,
					data: { items: [], nextCursor: null },
				});

				const crossCursor = await listLegalEstablishmentsAsOf(
					{
						legalCompanyId: company.data.legalCompanyId,
						asOf: "2026-08-15",
						pagination: {
							limit: 10,
							cursor: ownerPage.data.nextCursor ?? undefined,
						},
					},
					caQueryOptions({ organizationId: attackerOrganizationId }),
					establishmentDependencies,
				);
				expect(crossCursor).toMatchObject({
					ok: false,
					code: "VALIDATION_ERROR",
				});

				const companyAfterSecond = await getLegalCompany(
					{ legalCompanyId: company.data.legalCompanyId },
					ownerQuery,
					establishmentDependencies,
				);
				expectOk(companyAfterSecond);

				const body = await createGovernanceBody(
					{
						legalCompanyId: company.data.legalCompanyId,
						bodyType: "board",
						bodyCode: "BOARD",
						displayName: "Board of Directors",
						description: null,
						effectiveFrom: "2026-01-01",
						sourceDocumentId: "doc:list:gov",
						expectedCompanyVersion: companyAfterSecond.data.version,
					},
					{ ...ownerOptions, idempotencyKey: "idem-list-gov" },
					governanceDependencies,
				);
				expectOk(body);

				const crossBodies = await listGovernanceBodiesAsOf(
					{
						legalCompanyId: company.data.legalCompanyId,
						asOf: "2026-06-01",
					},
					caQueryOptions({ organizationId: attackerOrganizationId }),
					governanceDependencies,
				);
				expect(crossBodies).toMatchObject({
					ok: true,
					data: { items: [], nextCursor: null },
				});
			} finally {
				await cleanupCorporateAdministrationGovernanceTestData(
					attackerOrganizationId,
				);
				await cleanupCorporateAdministrationGovernanceTestData(
					ownerOrganizationId,
				);
				await cleanupCorporateAdministrationEstablishmentTestData(
					attackerOrganizationId,
				);
				await cleanupCorporateAdministrationEstablishmentTestData(
					ownerOrganizationId,
				);
			}
		});
	},
);
