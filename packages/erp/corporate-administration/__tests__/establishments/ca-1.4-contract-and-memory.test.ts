import {
	assertNoRegisteredAddressOverlap,
	canonicalDateSchema,
	canonicalInstantSchema,
	normalizeEstablishmentRegistrationIdentifier,
	organizationIdSchema,
	registerLegalEstablishmentInputSchema,
	setRegisteredAddressInputSchema,
	userIdSchema,
	validateEstablishmentChronology,
	validateEstablishmentStatusTransition,
} from "@afenda/corporate-administration";
import { createMemoryCorporateAdministrationEstablishmentStore } from "@afenda/corporate-administration/testing";
import { describe, expect, it } from "vitest";
import {
	legalCompanyIdSchema,
	legalEstablishmentIdSchema,
} from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-1-4");
const otherOrganizationId = organizationIdSchema.parse("org-ca-1-4-other");
const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000141",
);
const actorUserId = userIdSchema.parse("user-ca-1-4");
const recordedAt = canonicalInstantSchema.parse("2026-01-02T10:00:00.000Z");
describe("CA-1.4 contracts and rules", () => {
	it("keeps browser-controlled tenant and actor fields outside command input", () => {
		const parsed = registerLegalEstablishmentInputSchema.safeParse({
			legalCompanyId,
			establishmentType: "branch",
			jurisdictionCode: "MY",
			registrationIdentifier: "BR-2026-001",
			displayName: "Kuala Lumpur Branch",
			registeredFrom: "2026-01-02",
			sourceDocumentId: "doc-branch-1",
			expectedCompanyVersion: 1,
			organizationId,
			actorUserId,
		});
		expect(parsed.success).toBe(false);
	});
	it("preserves establishment/address distinctions and validates effective dates", () => {
		expect(
			setRegisteredAddressInputSchema.safeParse({
				legalCompanyId,
				addressType: "registered_office",
				sourcePartyAddressId: "00000000-0000-4000-8000-000000000142",
				effectiveFrom: "2026-04-01",
				effectiveTo: "2026-03-31",
				sourceDocumentId: "doc-address-1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(false);
		expect(
			normalizeEstablishmentRegistrationIdentifier(" br-2026  .001 "),
		).toBe("BR2026001");
	});
	it("enforces the status transition graph and company-existence chronology", () => {
		expect(
			validateEstablishmentStatusTransition({
				from: "registered",
				to: "active",
			}).ok,
		).toBe(true);
		expect(
			validateEstablishmentStatusTransition({ from: "closed", to: "active" })
				.ok,
		).toBe(false);
		expect(
			validateEstablishmentChronology({
				registeredFrom: canonicalDateSchema.parse("2025-12-31"),
				transitionDate: canonicalDateSchema.parse("2026-01-02"),
				companyCreatedAt: recordedAt,
			}).ok,
		).toBe(false);
	});
	it("rejects overlapping statutory address history", () => {
		const overlap = assertNoRegisteredAddressOverlap({
			candidate: {
				effectiveFrom: canonicalDateSchema.parse("2026-06-01"),
				effectiveTo: null,
			},
			existing: [
				{
					effectiveFrom: canonicalDateSchema.parse("2026-01-01"),
					effectiveTo: null,
				},
			],
		});
		expect(overlap.ok).toBe(false);
	});
});
describe("CA-1.4 memory establishment store", () => {
	it("preserves tenant isolation, natural-key uniqueness, status history and as-of reads", async () => {
		const store = createMemoryCorporateAdministrationEstablishmentStore();
		const registered = await store.registerLegalEstablishment({
			organizationId,
			legalCompanyId,
			establishmentType: "branch",
			jurisdictionCode: "MY",
			registrationIdentifier: "BR-2026-001",
			normalizedRegistrationIdentifier: "BR2026001",
			displayName: "Kuala Lumpur Branch",
			registeredFrom: canonicalDateSchema.parse("2026-01-02"),
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-branch-1",
			expectedCompanyVersion: 1,
		});
		expect(registered.ok).toBe(true);
		if (!registered.ok) {
			return;
		}
		const duplicate = await store.registerLegalEstablishment({
			organizationId,
			legalCompanyId,
			establishmentType: "branch",
			jurisdictionCode: "MY",
			registrationIdentifier: "BR 2026-001",
			normalizedRegistrationIdentifier: "BR2026001",
			displayName: "Duplicate Branch",
			registeredFrom: canonicalDateSchema.parse("2026-02-01"),
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-branch-2",
			expectedCompanyVersion: 1,
		});
		expect(duplicate.ok).toBe(false);
		const crossTenant = await store.getLegalEstablishment({
			organizationId: otherOrganizationId,
			legalEstablishmentId: registered.data.id,
		});
		expect(crossTenant).toEqual({ ok: true, data: null });
		const activated = await store.transitionLegalEstablishment({
			organizationId,
			legalEstablishmentId: registered.data.id,
			status: "active",
			effectiveFrom: canonicalDateSchema.parse("2026-03-01"),
			reason: "Registration became effective",
			recordedAt: canonicalInstantSchema.parse("2026-02-15T10:00:00.000Z"),
			recordedBy: actorUserId,
			sourceDocumentId: "doc-activation-1",
			expectedVersion: 1,
		});
		expect(activated.ok).toBe(true);
		const before = await store.listLegalEstablishmentsAsOf({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-02-28"),
		});
		const after = await store.listLegalEstablishmentsAsOf({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-03-01"),
		});
		expect(before.ok && before.data[0]?.currentStatus).toBe("registered");
		expect(after.ok && after.data[0]?.currentStatus).toBe("active");
	});
	it("reconstructs distinct address and premise facts without mutating party address", async () => {
		const store = createMemoryCorporateAdministrationEstablishmentStore();
		const establishmentId = legalEstablishmentIdSchema.parse(
			"00000000-0000-4000-8000-000000000143",
		);
		const address = {
			sourcePartyAddressId: "00000000-0000-4000-8000-000000000144",
			line1: "1 Statutory Way",
			line2: null,
			city: "Kuala Lumpur",
			region: "Kuala Lumpur",
			postalCode: "50000",
			countryCode: "MY",
		} as const;
		const registeredAddress = await store.setRegisteredAddress({
			organizationId,
			legalCompanyId,
			legalEstablishmentId: establishmentId,
			addressType: "registered_office",
			address,
			effectiveFrom: canonicalDateSchema.parse("2026-01-01"),
			effectiveTo: null,
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-address-1",
		});
		const premise = await store.registerPremise({
			organizationId,
			legalCompanyId,
			legalEstablishmentId: establishmentId,
			premiseType: "office",
			displayName: "Operations Office",
			address,
			effectiveFrom: canonicalDateSchema.parse("2026-02-01"),
			effectiveTo: null,
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-premise-1",
		});
		expect(registeredAddress.ok).toBe(true);
		expect(premise.ok).toBe(true);
		expect(registeredAddress.ok && registeredAddress.data.addressType).toBe(
			"registered_office",
		);
		expect(premise.ok && premise.data.premiseType).toBe("office");
	});
});
