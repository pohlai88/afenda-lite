// biome-ignore-all lint/style/noNestedTernary: Fixture selection mirrors the three-state officer contract.
// biome-ignore-all lint/suspicious/useAwait: Officer fixtures implement asynchronous production ports.
import {
	assertNoOfficerAppointmentConflict,
	calculateOfficerVacancyStatus,
	canonicalDateSchema,
	canonicalInstantSchema,
	commandFingerprintSchema,
	defineStatutoryOfficeInputSchema,
	listOfficersAsOfInputSchema,
	listRequiredStatutoryOfficesInputSchema,
	officerAppointmentIdSchema,
	officerQualificationIdSchema,
	officerQualificationMatchesAsOf,
	organizationIdSchema,
	statutoryOfficeIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createMemoryCorporateAdministrationOfficerStore } from "@afenda/corporate-administration/testing";
import { describe, expect, it } from "vitest";
import { verifyCorporateAdministrationApproval } from "../../src/kernel/authorization/authorization";
import {
	approvalDecisionIdSchema,
	approvalRequestIdSchema,
	legalCompanyIdSchema,
} from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-2-2");
const otherOrganizationId = organizationIdSchema.parse("org-ca-2-2-other");
const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000221",
);
const actorUserId = userIdSchema.parse("user-ca-2-2");
const approverUserId = userIdSchema.parse("user-ca-2-2-approver");
const recordedAt = canonicalInstantSchema.parse("2026-02-15T10:00:00.000Z");

describe("CA-2.2 statutory office contracts and rules", () => {
	it("keeps tenant and actor fields outside statutory office command input", () => {
		const parsed = defineStatutoryOfficeInputSchema.safeParse({
			legalCompanyId,
			officeTypeCode: "DIRECTOR",
			jurisdictionCode: "MY",
			displayName: "Director",
			required: true,
			minimumHolders: 1,
			maximumHolders: 5,
			vacancyGraceDays: 30,
			protectedRole: true,
			effectiveFrom: "2026-02-15",
			sourceDocumentId: "doc-office-1",
			expectedCompanyVersion: 1,
			organizationId,
			actorUserId,
		});
		expect(parsed.success).toBe(false);
	});

	it("bounds statutory-office page sizes at the public query contract", () => {
		const base = {
			legalCompanyId,
			asOf: "2026-06-01",
		};
		expect(
			listRequiredStatutoryOfficesInputSchema.safeParse({
				...base,
				pageSize: 100,
			}).success,
		).toBe(true);
		expect(
			listRequiredStatutoryOfficesInputSchema.safeParse({
				...base,
				pageSize: 101,
			}).success,
		).toBe(false);
	});

	it("bounds officer-appointment page sizes at the public query contract", () => {
		const base = {
			legalCompanyId,
			asOf: "2026-06-01",
		};
		expect(
			listOfficersAsOfInputSchema.safeParse({ ...base, pageSize: 100 }).success,
		).toBe(true);
		expect(
			listOfficersAsOfInputSchema.safeParse({ ...base, pageSize: 101 }).success,
		).toBe(false);
	});

	it("computes deterministic vacancy and overfill status from office rules", () => {
		const office = makeOffice({ minimumHolders: 2, maximumHolders: 2 });
		const appointments = [
			makeAppointment({ officerPartyId: "party-director-1" }),
			makeAppointment({ officerPartyId: "party-director-2" }),
			makeAppointment({ officerPartyId: "party-director-3" }),
		];
		const vacant = calculateOfficerVacancyStatus({
			office,
			activeAppointments: [],
			asOf: canonicalDateSchema.parse("2026-02-20"),
		});
		expect(vacant).toMatchObject({
			activeHolderCount: 0,
			vacant: true,
			withinGracePeriod: true,
			gracePeriodEndsOn: "2026-03-22",
		});
		const overfilled = calculateOfficerVacancyStatus({
			office,
			activeAppointments: appointments,
			asOf: canonicalDateSchema.parse("2026-02-20"),
		});
		expect(overfilled).toMatchObject({
			activeHolderCount: 3,
			vacant: false,
			overfilled: true,
		});
	});

	it("rejects duplicate overlapping appointments and recognizes verified current qualifications", () => {
		const office = makeOffice({ maximumHolders: 1 });
		const existing = makeAppointment({ officerPartyId: "party-director-1" });
		expect(
			assertNoOfficerAppointmentConflict({
				candidate: {
					id: officerAppointmentIdSchema.parse(
						"00000000-0000-4000-8000-000000000224",
					),
					statutoryOfficeId: office.id,
					officerPartyId: "party-director-1",
					effectiveFrom: canonicalDateSchema.parse("2026-03-01"),
					effectiveTo: null,
				},
				office,
				existing: [existing],
			}).ok,
		).toBe(false);
		expect(
			officerQualificationMatchesAsOf(
				{
					id: officerQualificationIdSchema.parse(
						"00000000-0000-4000-8000-000000000225",
					),
					organizationId,
					legalCompanyId,
					officerAppointmentId: existing.id,
					qualificationTypeCode: "SECRETARY_LICENSE",
					issuer: "Companies Commission",
					referenceNumber: "QUAL-1",
					validFrom: canonicalDateSchema.parse("2026-01-01"),
					validTo: canonicalDateSchema.parse("2026-12-31"),
					verificationStatus: "verified",
					verifiedAt: new Date(recordedAt),
					recordedAt: new Date(recordedAt),
					recordedBy: actorUserId,
					sourceDocumentId: "doc-qualification-1",
					version: 1,
					createdAt: new Date(recordedAt),
					updatedAt: new Date(recordedAt),
				},
				canonicalDateSchema.parse("2026-07-01"),
			),
		).toBe(true);
	});

	it("enforces approval segregation for protected officer actions", async () => {
		const approvalRequestId = approvalRequestIdSchema.parse(
			"00000000-0000-4000-8000-000000000226",
		);
		const approvalDecisionId = approvalDecisionIdSchema.parse(
			"00000000-0000-4000-8000-000000000227",
		);
		const commandFingerprint = commandFingerprintSchema.parse("0".repeat(64));
		const rejected = await verifyCorporateAdministrationApproval(
			{
				approvalDecisions: {
					async verify() {
						return {
							ok: true,
							data: {
								organizationId,
								approvalRequestId,
								approvalDecisionId,
								commandFingerprint,
								approved: true,
								approverUserId: actorUserId,
							},
						};
					},
				},
			},
			{
				organizationId,
				actorUserId,
				approvalRequestId,
				approvalDecisionId,
				commandFingerprint,
			},
		);
		expect(rejected.ok).toBe(false);
		const approved = await verifyCorporateAdministrationApproval(
			{
				approvalDecisions: {
					async verify() {
						return {
							ok: true,
							data: {
								organizationId,
								approvalRequestId,
								approvalDecisionId,
								commandFingerprint,
								approved: true,
								approverUserId,
							},
						};
					},
				},
			},
			{
				organizationId,
				actorUserId,
				approvalRequestId,
				approvalDecisionId,
				commandFingerprint,
			},
		);
		expect(approved.ok).toBe(true);
	});
});

describe("CA-2.2 memory officer store", () => {
	it("preserves tenant isolation, as-of appointment reads, lifecycle endings and qualifications", async () => {
		const store = createMemoryCorporateAdministrationOfficerStore();
		const office = await store.defineStatutoryOffice({
			organizationId,
			legalCompanyId,
			officeTypeCode: "DIRECTOR",
			jurisdictionCode: "MY",
			displayName: "Director",
			description: null,
			required: true,
			minimumHolders: 1,
			maximumHolders: 3,
			vacancyGraceDays: 30,
			protectedRole: true,
			effectiveFrom: canonicalDateSchema.parse("2026-02-15"),
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-office-1",
			expectedCompanyVersion: 1,
		});
		expect(office.ok).toBe(true);
		if (!office.ok) {
			return;
		}

		const crossTenant = await store.getStatutoryOffice({
			organizationId: otherOrganizationId,
			statutoryOfficeId: office.data.id,
		});
		expect(crossTenant).toEqual({ ok: true, data: null });

		const additionalOffices = await Promise.all(
			[
				["SECRETARY", "MY", "Company Secretary"],
				["AUDITOR", "SG", "Auditor"],
			].map(([officeTypeCode, jurisdictionCode, displayName], index) =>
				store.defineStatutoryOffice({
					organizationId,
					legalCompanyId,
					officeTypeCode,
					jurisdictionCode,
					displayName,
					description: null,
					required: true,
					minimumHolders: 1,
					maximumHolders: 3,
					vacancyGraceDays: 30,
					protectedRole: false,
					effectiveFrom: canonicalDateSchema.parse("2026-02-15"),
					recordedAt,
					recordedBy: actorUserId,
					sourceDocumentId: `doc-office-${index + 2}`,
					expectedCompanyVersion: 1,
				}),
			),
		);
		expect(additionalOffices.every((result) => result.ok)).toBe(true);
		const firstOfficePage = await store.listRequiredStatutoryOffices({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-06-01"),
			pageSize: 2,
		});
		expect(firstOfficePage.ok).toBe(true);
		if (!firstOfficePage.ok || firstOfficePage.data.nextCursor === null) {
			return;
		}
		expect(
			firstOfficePage.data.items.map((item) => item.officeTypeCode),
		).toEqual(["DIRECTOR", "SECRETARY"]);
		const secondOfficePage = await store.listRequiredStatutoryOffices({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-06-01"),
			pageSize: 2,
			cursor: firstOfficePage.data.nextCursor,
		});
		expect(
			secondOfficePage.ok
				? {
						codes: secondOfficePage.data.items.map(
							(item) => item.officeTypeCode,
						),
						nextCursor: secondOfficePage.data.nextCursor,
					}
				: secondOfficePage,
		).toEqual({ codes: ["AUDITOR"], nextCursor: null });
		const crossScope = await store.listRequiredStatutoryOffices({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-06-01"),
			includeOptional: true,
			pageSize: 2,
			cursor: firstOfficePage.data.nextCursor,
		});
		expect(crossScope.ok ? "unexpected-success" : crossScope.code).toBe(
			"VALIDATION_ERROR",
		);

		const appointment = await store.appointOfficer({
			organizationId,
			legalCompanyId,
			statutoryOfficeId: office.data.id,
			officerPartyId: "party-director-1",
			appointmentMethod: "board_resolution",
			appointingAuthorityType: "governance_body",
			appointingAuthorityId: "board-main",
			consentDocumentId: "doc-consent-1",
			sourceDocumentId: "doc-appointment-1",
			effectiveFrom: canonicalDateSchema.parse("2026-03-01"),
			effectiveTo: null,
			recordedAt,
			recordedBy: actorUserId,
			expectedOfficeVersion: 1,
		});
		expect(appointment.ok).toBe(true);
		if (!appointment.ok) {
			return;
		}

		const before = await store.listOfficersAsOf({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-02-28"),
		});
		const after = await store.listOfficersAsOf({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-03-01"),
		});
		expect(before).toEqual({
			ok: true,
			data: { items: [], nextCursor: null },
		});
		expect(after.ok && after.data.items).toHaveLength(1);

		const qualification = await store.recordOfficerQualification({
			organizationId,
			legalCompanyId,
			officerAppointmentId: appointment.data.id,
			qualificationTypeCode: "DIRECTOR_CONSENT",
			issuer: "Board Secretary",
			referenceNumber: "CONSENT-1",
			validFrom: canonicalDateSchema.parse("2026-03-01"),
			validTo: null,
			verificationStatus: "verified",
			verifiedAt: new Date(recordedAt),
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-qualification-1",
			expectedAppointmentVersion: 1,
		});
		expect(qualification.ok && qualification.data.verificationStatus).toBe(
			"verified",
		);

		const resigned = await store.endOfficerAppointment({
			organizationId,
			officerAppointmentId: appointment.data.id,
			endedOn: canonicalDateSchema.parse("2026-06-01"),
			status: "resigned",
			reason: "Voluntary resignation",
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-resignation-1",
			expectedVersion: 1,
		});
		expect(resigned.ok && resigned.data.status).toBe("resigned");
		const afterResignation = await store.listOfficersAsOf({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-06-01"),
		});
		expect(afterResignation).toEqual({
			ok: true,
			data: { items: [], nextCursor: null },
		});
	});
});

function makeOffice(
	overrides: Partial<{
		minimumHolders: number;
		maximumHolders: number | null;
	}> = {},
) {
	return {
		id: statutoryOfficeIdSchema.parse("00000000-0000-4000-8000-000000000222"),
		organizationId,
		legalCompanyId,
		officeTypeCode: "DIRECTOR",
		jurisdictionCode: "MY",
		displayName: "Director",
		description: null,
		required: true,
		minimumHolders: overrides.minimumHolders ?? 1,
		maximumHolders: overrides.maximumHolders ?? 5,
		vacancyGraceDays: 30,
		protectedRole: true,
		effectiveFrom: canonicalDateSchema.parse("2026-02-15"),
		effectiveTo: null,
		status: "active",
		retirementReason: null,
		recordedAt: new Date(recordedAt),
		recordedBy: actorUserId,
		sourceDocumentId: "doc-office-1",
		version: 1,
		createdAt: new Date(recordedAt),
		updatedAt: new Date(recordedAt),
	} as const;
}

function makeAppointment(input: { officerPartyId: string }) {
	return {
		id: officerAppointmentIdSchema.parse(
			input.officerPartyId.endsWith("1")
				? "00000000-0000-4000-8000-000000000223"
				: input.officerPartyId.endsWith("2")
					? "00000000-0000-4000-8000-000000000228"
					: "00000000-0000-4000-8000-000000000229",
		),
		organizationId,
		legalCompanyId,
		statutoryOfficeId: statutoryOfficeIdSchema.parse(
			"00000000-0000-4000-8000-000000000222",
		),
		officerPartyId: input.officerPartyId,
		appointmentMethod: "board_resolution",
		appointingAuthorityType: "governance_body",
		appointingAuthorityId: "board-main",
		consentDocumentId: "doc-consent-1",
		sourceDocumentId: "doc-appointment-1",
		effectiveFrom: canonicalDateSchema.parse("2026-02-15"),
		effectiveTo: null,
		status: "active",
		endReason: null,
		recordedAt: new Date(recordedAt),
		recordedBy: actorUserId,
		version: 1,
		createdAt: new Date(recordedAt),
		updatedAt: new Date(recordedAt),
	} as const;
}
