import { describe, expect, it } from "vitest";

import {
	CA_AUTHORITY_MANDATE_GRANTED_EVENT,
	CA_CHARGE_RELEASED_EVENT,
	CA_EVENT_IDS,
	CA_OFFICER_APPOINTED_EVENT,
	CA_RESOLUTION_APPROVED_EVENT,
	CorporateAdministrationEventSchemas,
	caGovernancePayloadSchema,
	caPropertyAssetsPayloadSchema,
	isKnownEventType,
} from "../src/schemas/index";

const governancePayload = {
	organizationId: "org-ca",
	legalCompanyId: "10000000-0000-4000-8000-000000000001",
	entityType: "officer_appointment",
	entityId: "20000000-0000-4000-8000-000000000001",
	version: 1,
	actorId: "user-ca",
	correlationId: "corr-ca",
	status: "active",
	effectiveFrom: "2026-07-25",
	effectiveTo: null,
	supersedesId: null,
} as const;

describe("@afenda/events corporate administration schemas", () => {
	it("publishes the complete CA event catalog through the public barrel", () => {
		expect(CA_EVENT_IDS).toHaveLength(50);
		expect(CA_EVENT_IDS).toContain(CA_OFFICER_APPOINTED_EVENT);
		expect(CA_EVENT_IDS).toContain(CA_AUTHORITY_MANDATE_GRANTED_EVENT);
		expect(CA_EVENT_IDS).toContain(CA_RESOLUTION_APPROVED_EVENT);
		expect(CA_EVENT_IDS).toContain(CA_CHARGE_RELEASED_EVENT);
		for (const eventId of CA_EVENT_IDS) {
			expect(CorporateAdministrationEventSchemas[eventId]).toBeDefined();
			expect(isKnownEventType(eventId)).toBe(true);
		}
	});

	it("accepts safe CA-4 snapshots and rejects evidence or document leakage", () => {
		const payload = {
			organizationId: "org-ca",
			legalCompanyId: "10000000-0000-4000-8000-000000000001",
			entityType: "charge",
			entityId: "20000000-0000-4000-8000-000000000001",
			version: 3,
			actorId: "user-ca",
			correlationId: "corr-ca4",
		} as const;
		expect(caPropertyAssetsPayloadSchema.safeParse(payload).success).toBe(true);
		expect(
			caPropertyAssetsPayloadSchema.safeParse({
				...payload,
				evidenceReference: "document:secret",
			}).success,
		).toBe(false);
	});

	it("accepts the minimal tenant-scoped governance payload", () => {
		expect(caGovernancePayloadSchema.safeParse(governancePayload).success).toBe(
			true,
		);
	});

	it("rejects payloads without the legal-company boundary or valid entity id", () => {
		const { legalCompanyId: _legalCompanyId, ...withoutCompany } =
			governancePayload;
		expect(caGovernancePayloadSchema.safeParse(withoutCompany).success).toBe(
			false,
		);
		expect(
			caGovernancePayloadSchema.safeParse({
				...governancePayload,
				entityId: "not-a-uuid",
			}).success,
		).toBe(false);
	});
});
