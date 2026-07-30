// biome-ignore-all lint/style/noNestedTernary: Fixture selection mirrors the three-state compliance contract.
import {
	calculateOfficerEligibilityAsOf,
	canonicalDateSchema,
	canonicalInstantSchema,
	conflictDisclosureSchema,
	officerAppointmentIdSchema,
	organizationIdSchema,
	recordOfficerDeclarationInputSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createMemoryCorporateAdministrationOfficerComplianceStore } from "@afenda/corporate-administration/testing";
import { describe, expect, it } from "vitest";
import { legalCompanyIdSchema } from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-2-3");
const otherOrganizationId = organizationIdSchema.parse("org-ca-2-3-other");
const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000231",
);
const officerAppointmentId = officerAppointmentIdSchema.parse(
	"00000000-0000-4000-8000-000000000232",
);
const actorUserId = userIdSchema.parse("user-ca-2-3");
const recordedAt = canonicalInstantSchema.parse("2026-04-01T10:00:00.000Z");

describe("CA-2.3 officer compliance contracts and rules", () => {
	it("keeps sensitive declarations masked or referenced and rejects raw empty details", () => {
		const parsed = recordOfficerDeclarationInputSchema.safeParse({
			officerAppointmentId,
			declarationType: "fit_and_proper",
			effectiveFrom: "2026-04-01",
			sourceDocumentId: "doc-declaration-1",
			expectedAppointmentVersion: 1,
			organizationId,
			actorUserId,
		});
		expect(parsed.success).toBe(false);
	});

	it("resolves eligibility from current declarations and active disqualifications", () => {
		const eligibility = calculateOfficerEligibilityAsOf({
			officerAppointmentId,
			asOf: canonicalDateSchema.parse("2026-04-15"),
			declarations: [
				makeDeclaration("consent"),
				makeDeclaration("eligibility"),
				makeDeclaration("fit_and_proper"),
			],
			disqualifications: [],
		});
		expect(eligibility).toMatchObject({
			eligible: true,
			activeDisqualificationCount: 0,
			missingDeclarationTypes: [],
		});
		const blocked = calculateOfficerEligibilityAsOf({
			officerAppointmentId,
			asOf: canonicalDateSchema.parse("2026-04-15"),
			declarations: [makeDeclaration("consent")],
			disqualifications: [
				{
					id: "00000000-0000-4000-8000-000000000236",
					organizationId,
					legalCompanyId,
					officerAppointmentId,
					reasonCode: "COURT_ORDER",
					authorityReference: "AUTH-1",
					sourceDocumentId: "doc-disqualification-1",
					effectiveFrom: canonicalDateSchema.parse("2026-04-01"),
					effectiveTo: null,
					status: "active",
					endReason: null,
					recordedAt: new Date(recordedAt),
					recordedBy: actorUserId,
					version: 1,
					createdAt: new Date(recordedAt),
					updatedAt: new Date(recordedAt),
				},
			],
		});
		expect(blocked.eligible).toBe(false);
		expect(blocked.activeDisqualificationCount).toBe(1);
		expect(blocked.missingDeclarationTypes).toContain("eligibility");
	});

	it("validates conflict disclosures do not expose raw sensitive payloads", () => {
		const parsed = conflictDisclosureSchema.safeParse({
			id: "00000000-0000-4000-8000-000000000237",
			organizationId,
			legalCompanyId,
			officerAppointmentId,
			matterType: "resolution",
			matterId: "resolution-1",
			conflictTypeCode: "RELATED_PARTY",
			status: "disclosed",
			sensitiveDetailRef: "doc-object-conflict-1",
			maskedSummary: "Related-party conflict recorded",
			disclosedAt: new Date(recordedAt),
			recusalRecordedAt: null,
			recusalReason: null,
			sourceDocumentId: "doc-conflict-1",
			recordedAt: new Date(recordedAt),
			recordedBy: actorUserId,
			version: 1,
			createdAt: new Date(recordedAt),
			updatedAt: new Date(recordedAt),
			rawDescription: "must fail strict schema",
		});
		expect(parsed.success).toBe(false);
	});
});

describe("CA-2.3 memory officer compliance store", () => {
	it("preserves tenant isolation, reminder eligibility, active disqualification and recusal linkage", async () => {
		const store = createMemoryCorporateAdministrationOfficerComplianceStore();
		const declaration = await store.recordOfficerDeclaration({
			organizationId,
			legalCompanyId,
			officerAppointmentId,
			declarationType: "eligibility",
			effectiveFrom: canonicalDateSchema.parse("2026-04-01"),
			expiresOn: canonicalDateSchema.parse("2026-04-30"),
			sensitiveDetailRef: "doc-object-declaration-1",
			maskedSummary: "Eligibility declaration recorded",
			sourceDocumentId: "doc-declaration-1",
			recordedAt,
			recordedBy: actorUserId,
			expectedAppointmentVersion: 1,
		});
		expect(declaration.ok).toBe(true);
		if (!declaration.ok) {
			return;
		}

		const crossTenant = await store.getOfficerDeclaration({
			organizationId: otherOrganizationId,
			officerDeclarationId: declaration.data.id,
		});
		expect(crossTenant).toEqual({ ok: true, data: null });

		const expiring = await store.listExpiringDeclarations({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-04-01"),
			windowDays: 30,
		});
		expect(expiring.ok && expiring.data).toHaveLength(1);

		const disqualification = await store.recordOfficerDisqualification({
			organizationId,
			legalCompanyId,
			officerAppointmentId,
			reasonCode: "COURT_ORDER",
			authorityReference: "AUTH-1",
			sourceDocumentId: "doc-disqualification-1",
			effectiveFrom: canonicalDateSchema.parse("2026-04-10"),
			effectiveTo: null,
			recordedAt,
			recordedBy: actorUserId,
			expectedAppointmentVersion: 1,
		});
		expect(disqualification.ok).toBe(true);
		const active = await store.listActiveDisqualifications({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-04-15"),
			officerAppointmentId,
		});
		expect(active.ok && active.data).toHaveLength(1);

		const conflict = await store.discloseConflict({
			organizationId,
			legalCompanyId,
			officerAppointmentId,
			matterType: "resolution",
			matterId: "resolution-1",
			conflictTypeCode: "RELATED_PARTY",
			sensitiveDetailRef: "doc-object-conflict-1",
			maskedSummary: "Related-party conflict recorded",
			disclosedAt: new Date(recordedAt),
			sourceDocumentId: "doc-conflict-1",
			recordedAt,
			recordedBy: actorUserId,
			expectedAppointmentVersion: 1,
		});
		expect(conflict.ok).toBe(true);
		if (!conflict.ok) {
			return;
		}
		const recused = await store.recordRecusal({
			organizationId,
			conflictDisclosureId: conflict.data.id,
			recusalReason: "Officer left the matter vote",
			sourceDocumentId: "doc-recusal-1",
			recordedAt,
			recordedBy: actorUserId,
			expectedVersion: 1,
		});
		expect(recused.ok && recused.data.status).toBe("recused");
		const conflicts = await store.listConflictsForMatter({
			organizationId,
			legalCompanyId,
			matterType: "resolution",
			matterId: "resolution-1",
		});
		expect(conflicts.ok && conflicts.data[0]?.status).toBe("recused");
	});
});

function makeDeclaration(
	declarationType: "consent" | "eligibility" | "fit_and_proper",
) {
	return {
		id:
			declarationType === "consent"
				? "00000000-0000-4000-8000-000000000233"
				: declarationType === "eligibility"
					? "00000000-0000-4000-8000-000000000234"
					: "00000000-0000-4000-8000-000000000235",
		organizationId,
		legalCompanyId,
		officerAppointmentId,
		declarationType,
		status: "active",
		effectiveFrom: canonicalDateSchema.parse("2026-04-01"),
		expiresOn: canonicalDateSchema.parse("2026-12-31"),
		sensitiveDetailRef: "doc-object-declaration-1",
		maskedSummary: "Declaration recorded",
		sourceDocumentId: "doc-declaration-1",
		supersededAt: null,
		supersededByDeclarationId: null,
		recordedAt: new Date(recordedAt),
		recordedBy: actorUserId,
		version: 1,
		createdAt: new Date(recordedAt),
		updatedAt: new Date(recordedAt),
	} as const;
}
