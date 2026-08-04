// biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared privacy assertions are invoked only from test cases.
import {
	createGovernanceBody,
	defineStatutoryOffice,
	recordWrittenResolution,
	registerLegalCompanyDraft,
	registerLegalEstablishment,
	scheduleGovernanceMeeting,
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
	createDrizzleCompanyDependencies,
	expectOk,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationEstablishmentTestData,
	cleanupCorporateAdministrationGovernanceTestData,
	cleanupCorporateAdministrationInfrastructureTestData,
	cleanupCorporateAdministrationMeetingTestData,
	cleanupCorporateAdministrationOfficerTestData,
	cleanupCorporateAdministrationResolutionTestData,
	listCorporateAdministrationAuditFacts,
	listCorporateAdministrationOutboxEvents,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const FORBIDDEN_PAYLOAD_KEYS = [
	"displayName",
	"registrationIdentifier",
	"normalizedRegistrationIdentifier",
	"title",
	"textDigest",
	"documentId",
	"locationSummary",
	"remoteAccessSummary",
	"description",
	"sourceDocumentId",
	"access_token",
	"password",
	"bank_account_number",
] as const;

const FORBIDDEN_SERIALIZED_FRAGMENTS = [
	"access_token",
	"password",
	"bank_account",
	"oldValue",
	"newValue",
	"before",
	"after",
	"payload",
] as const;

function expectPrivacySafeAudit(input: {
	rows: Awaited<ReturnType<typeof listCorporateAdministrationAuditFacts>>;
	entity: string;
	entityId: string;
	action: string;
}) {
	const matching = input.rows.filter(
		(row) =>
			row.entity === input.entity &&
			row.entityId === input.entityId &&
			row.action === input.action,
	);
	expect(matching).toHaveLength(1);
	const [fact] = matching;
	expect(fact?.module).toBe("corporate-administration");
	expect(fact?.oldValue).toBeNull();
	expect(fact?.newValue).toBeNull();
	expect(fact?.changes).toEqual([]);
	const serialized = JSON.stringify(fact?.metadata ?? {});
	for (const fragment of FORBIDDEN_SERIALIZED_FRAGMENTS) {
		expect(serialized).not.toContain(fragment);
	}
}

function expectPrivacySafeOutbox(input: {
	rows: Awaited<ReturnType<typeof listCorporateAdministrationOutboxEvents>>;
	type: string;
	aggregateIdKey: string;
	aggregateId: string;
}) {
	const matching = input.rows.filter((row) => row.type === input.type);
	expect(matching).toHaveLength(1);
	const [event] = matching;
	expect(event?.status).toBe("pending");
	expect(event?.payload).toEqual(
		expect.objectContaining({
			[input.aggregateIdKey]: input.aggregateId,
		}),
	);
	const payload =
		event?.payload !== null &&
		typeof event?.payload === "object" &&
		!Array.isArray(event.payload)
			? event.payload
			: {};
	for (const key of FORBIDDEN_PAYLOAD_KEYS) {
		expect(payload).not.toHaveProperty(key);
	}
	const serialized = JSON.stringify(event?.payload ?? {});
	for (const fragment of FORBIDDEN_SERIALIZED_FRAGMENTS) {
		expect(serialized).not.toContain(fragment);
	}
}

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`CA-APP-01 audit/outbox privacy (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("persists redacted company draft audit and outbox facts", async () => {
			const organizationId = uniqueCaOrganizationId("company-privacy");
			const dependencies = createDrizzleCompanyDependencies();
			const options = caCommandOptions({
				organizationId,
				idempotencyKey: "idem-company-privacy",
			});
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-privacy" }),
					options,
					dependencies,
				);
				expectOk(company);
				const audits =
					await listCorporateAdministrationAuditFacts(organizationId);
				const events =
					await listCorporateAdministrationOutboxEvents(organizationId);
				expectPrivacySafeAudit({
					rows: audits,
					entity: "ca_legal_company",
					entityId: company.data.legalCompanyId,
					action: "CREATE",
				});
				expectPrivacySafeOutbox({
					rows: events,
					type: "corporate_administration.legal_company.draft_registered.v1",
					aggregateIdKey: "legalCompanyId",
					aggregateId: company.data.legalCompanyId,
				});
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});

		it("persists redacted establishment audit and outbox facts", async () => {
			const organizationId = uniqueCaOrganizationId("est-privacy");
			const dependencies = createCaApp01EstablishmentDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-est-privacy" }),
					{ ...options, idempotencyKey: "idem-est-privacy-company" },
					dependencies,
				);
				expectOk(company);
				const establishment = await registerLegalEstablishment(
					{
						legalCompanyId: company.data.legalCompanyId,
						establishmentType: "branch",
						jurisdictionCode: "MY",
						registrationIdentifier: "BR-2026-PRIVACY",
						displayName: "Privacy Branch",
						registeredFrom: "2026-08-01",
						sourceDocumentId: "doc:est:privacy",
						expectedCompanyVersion: company.data.version,
					},
					{ ...options, idempotencyKey: "idem-est-privacy" },
					dependencies,
				);
				expectOk(establishment);
				const audits =
					await listCorporateAdministrationAuditFacts(organizationId);
				const events =
					await listCorporateAdministrationOutboxEvents(organizationId);
				expectPrivacySafeAudit({
					rows: audits,
					entity: "ca_legal_establishment",
					entityId: establishment.data.id,
					action: "CREATE",
				});
				expectPrivacySafeOutbox({
					rows: events,
					type: "corporate_administration.legal_establishment.registered.v1",
					aggregateIdKey: "legalEstablishmentId",
					aggregateId: establishment.data.id,
				});
			} finally {
				await cleanupCorporateAdministrationEstablishmentTestData(
					organizationId,
				);
			}
		});

		it("persists redacted governance body audit and outbox facts", async () => {
			const organizationId = uniqueCaOrganizationId("gov-privacy");
			const dependencies = createCaApp01GovernanceDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-gov-privacy" }),
					{ ...options, idempotencyKey: "idem-gov-privacy-company" },
					dependencies,
				);
				expectOk(company);
				const body = await createGovernanceBody(
					{
						legalCompanyId: company.data.legalCompanyId,
						bodyType: "board",
						bodyCode: "BOARD",
						displayName: "Privacy Board",
						description: "Sensitive board description",
						effectiveFrom: "2026-01-01",
						sourceDocumentId: "doc:gov:privacy",
						expectedCompanyVersion: company.data.version,
					},
					{ ...options, idempotencyKey: "idem-gov-privacy" },
					dependencies,
				);
				expectOk(body);
				const audits =
					await listCorporateAdministrationAuditFacts(organizationId);
				const events =
					await listCorporateAdministrationOutboxEvents(organizationId);
				expectPrivacySafeAudit({
					rows: audits,
					entity: "ca_governance_body",
					entityId: body.data.id,
					action: "CREATE",
				});
				expectPrivacySafeOutbox({
					rows: events,
					type: "corporate_administration.governance_body.created.v1",
					aggregateIdKey: "governanceBodyId",
					aggregateId: body.data.id,
				});
			} finally {
				await cleanupCorporateAdministrationGovernanceTestData(organizationId);
			}
		});

		it("persists redacted statutory office audit and outbox facts", async () => {
			const organizationId = uniqueCaOrganizationId("off-privacy");
			const dependencies = createCaApp01OfficerDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-off-privacy" }),
					{ ...options, idempotencyKey: "idem-off-privacy-company" },
					dependencies,
				);
				expectOk(company);
				const office = await defineStatutoryOffice(
					{
						legalCompanyId: company.data.legalCompanyId,
						officeTypeCode: "DIRECTOR",
						jurisdictionCode: "MY",
						displayName: "Privacy Director",
						description: "Sensitive office description",
						required: true,
						minimumHolders: 1,
						maximumHolders: 5,
						vacancyGraceDays: 30,
						protectedRole: false,
						effectiveFrom: "2026-01-01",
						sourceDocumentId: "doc:off:privacy",
						expectedCompanyVersion: company.data.version,
					},
					{ ...options, idempotencyKey: "idem-off-privacy" },
					dependencies,
				);
				expectOk(office);
				const audits =
					await listCorporateAdministrationAuditFacts(organizationId);
				const events =
					await listCorporateAdministrationOutboxEvents(organizationId);
				expectPrivacySafeAudit({
					rows: audits,
					entity: "ca_statutory_office",
					entityId: office.data.id,
					action: "CREATE",
				});
				expectPrivacySafeOutbox({
					rows: events,
					type: "corporate_administration.statutory_office.defined.v1",
					aggregateIdKey: "statutoryOfficeId",
					aggregateId: office.data.id,
				});
			} finally {
				await cleanupCorporateAdministrationOfficerTestData(organizationId);
			}
		});

		it("persists redacted meeting audit and outbox facts", async () => {
			const organizationId = uniqueCaOrganizationId("mtg-privacy");
			const dependencies = createCaApp01MeetingDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-mtg-privacy" }),
					{ ...options, idempotencyKey: "idem-mtg-privacy-company" },
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
						sourceDocumentId: "doc:mtg:privacy-body",
						expectedCompanyVersion: company.data.version,
					},
					{ ...options, idempotencyKey: "idem-mtg-privacy-body" },
					dependencies,
				);
				expectOk(body);
				const meeting = await scheduleGovernanceMeeting(
					{
						legalCompanyId: company.data.legalCompanyId,
						governanceBodyId: body.data.id,
						procedureType: "hybrid",
						title: "Sensitive meeting agenda title",
						scheduledStartAt: "2026-04-10T09:00:00.000Z",
						scheduledEndAt: "2026-04-10T10:00:00.000Z",
						noticePeriodDays: 5,
						locationSummary: "Secret board room",
						remoteAccessSummary: "Private conference link",
						sourceDocumentId: "doc:mtg:privacy",
						expectedBodyVersion: body.data.version,
					},
					{ ...options, idempotencyKey: "idem-mtg-privacy" },
					dependencies,
				);
				expectOk(meeting);
				const audits =
					await listCorporateAdministrationAuditFacts(organizationId);
				const events =
					await listCorporateAdministrationOutboxEvents(organizationId);
				expectPrivacySafeAudit({
					rows: audits,
					entity: "ca_governance_meeting",
					entityId: meeting.data.id,
					action: "CREATE",
				});
				expectPrivacySafeOutbox({
					rows: events,
					type: "corporate_administration.governance_meeting.scheduled.v1",
					aggregateIdKey: "governanceMeetingId",
					aggregateId: meeting.data.id,
				});
			} finally {
				await cleanupCorporateAdministrationMeetingTestData(organizationId);
			}
		});

		it("persists redacted written-resolution audit and outbox facts", async () => {
			const organizationId = uniqueCaOrganizationId("res-privacy");
			const dependencies = createCaApp01ResolutionDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-res-privacy" }),
					{ ...options, idempotencyKey: "idem-res-privacy-company" },
					dependencies,
				);
				expectOk(company);
				const resolution = await recordWrittenResolution(
					{
						legalCompanyId: company.data.legalCompanyId,
						resolutionCode: "WR-PRIVACY-001",
						title: "Sensitive resolution body title",
						textDigest: CA_APP_01_TEXT_DIGEST,
						documentId: "doc:res:privacy-text",
						effectiveFrom: "2026-05-01",
						approvedAt: "2026-05-01T10:00:00.000Z",
						eligibleVotes: 3,
						votesFor: 3,
						thresholdType: "unanimous",
						sourceDocumentId: "doc:res:privacy",
					},
					{ ...options, idempotencyKey: "idem-res-privacy" },
					dependencies,
				);
				expectOk(resolution);
				const audits =
					await listCorporateAdministrationAuditFacts(organizationId);
				const events =
					await listCorporateAdministrationOutboxEvents(organizationId);
				expectPrivacySafeAudit({
					rows: audits,
					entity: "ca_resolution",
					entityId: resolution.data.id,
					action: "CREATE",
				});
				expectPrivacySafeOutbox({
					rows: events,
					type: "corporate_administration.resolution.adopted.v1",
					aggregateIdKey: "resolutionId",
					aggregateId: resolution.data.id,
				});
			} finally {
				await cleanupCorporateAdministrationResolutionTestData(organizationId);
			}
		});
	},
);
