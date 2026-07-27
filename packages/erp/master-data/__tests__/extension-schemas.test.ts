import { describe, expect, it } from "vitest";

import {
	createPartyRoleInputSchema,
	findByExternalIdInputSchema,
	findPartyByExternalIdInputSchema,
	getPartyAddressInputSchema,
	getPrimaryPartyContactInputSchema,
	listItemExtensionsInputSchema,
	listPartyExtensionsInputSchema,
	listPartyRelationshipsInputSchema,
	listPartyRolesInputSchema,
	partyRoleLifecycleInputSchema,
	updatePartyAddressInputSchema,
	updatePartyContactInputSchema,
	updatePartyRoleInputSchema,
} from "../src/capabilities/extensions/extension-schemas";

const actor = {
	organizationId: "org-a",
	actorUserId: "user-1",
	correlationId: "corr-1",
};

const queryActor = {
	organizationId: "org-a",
	actorUserId: "user-1",
};

const partyId = "10000000-0000-4000-8000-000000000001";
const itemId = "20000000-0000-4000-8000-000000000001";
const roleId = "30000000-0000-4000-8000-000000000001";
const addressId = "40000000-0000-4000-8000-000000000001";
const contactId = "50000000-0000-4000-8000-000000000001";

describe("extension input schemas", () => {
	it("validates supplied effective ranges on create and update inputs", () => {
		expect(
			createPartyRoleInputSchema.safeParse({
				...actor,
				partyId,
				roleCode: "customer",
				validFrom: "2026-12-31T00:00:00.000Z",
				validTo: "2026-01-01T00:00:00.000Z",
			}).success,
		).toBe(false);

		expect(
			updatePartyRoleInputSchema.safeParse({
				...actor,
				id: roleId,
				expectedVersion: 1,
				validFrom: "2026-12-31T00:00:00.000Z",
				validTo: "2026-01-01T00:00:00.000Z",
			}).success,
		).toBe(false);

		expect(
			updatePartyAddressInputSchema.safeParse({
				...actor,
				id: addressId,
				expectedVersion: 1,
				effectiveFrom: "2026-12-31T00:00:00.000Z",
				effectiveTo: "2026-01-01T00:00:00.000Z",
			}).success,
		).toBe(false);

		expect(
			updatePartyContactInputSchema.safeParse({
				...actor,
				id: contactId,
				expectedVersion: 1,
				effectiveFrom: "2026-12-31T00:00:00.000Z",
				effectiveTo: "2026-01-01T00:00:00.000Z",
			}).success,
		).toBe(false);
	});

	it("rejects empty update patches", () => {
		expect(
			updatePartyRoleInputSchema.safeParse({
				...actor,
				id: roleId,
				expectedVersion: 1,
			}).success,
		).toBe(false);
		expect(
			updatePartyAddressInputSchema.safeParse({
				...actor,
				id: addressId,
				expectedVersion: 1,
			}).success,
		).toBe(false);
		expect(
			updatePartyContactInputSchema.safeParse({
				...actor,
				id: contactId,
				expectedVersion: 1,
			}).success,
		).toBe(false);
	});

	it("uses query context and normalized contact purpose for primary contact lookup", () => {
		expect(
			getPartyAddressInputSchema.safeParse({
				...queryActor,
				partyId,
				id: addressId,
			}).success,
		).toBe(true);

		const parsed = getPrimaryPartyContactInputSchema.safeParse({
			...queryActor,
			partyId,
			contactType: "email",
			purpose: "BILLING",
		});
		expect(parsed).toMatchObject({
			success: true,
			data: { purpose: "billing" },
		});
	});

	it("uses branded parent schemas for list queries", () => {
		expect(
			listPartyExtensionsInputSchema.safeParse({
				...queryActor,
				parentId: partyId,
			}).success,
		).toBe(true);
		expect(
			listItemExtensionsInputSchema.safeParse({
				...queryActor,
				parentId: itemId,
			}).success,
		).toBe(true);
	});

	it("uses relationship-specific party id for relationship list queries", () => {
		expect(
			listPartyRelationshipsInputSchema.safeParse({
				...queryActor,
				partyId,
			}).success,
		).toBe(true);
		expect(
			listPartyRelationshipsInputSchema.safeParse({
				...queryActor,
				parentId: partyId,
			}).success,
		).toBe(false);
	});

	it("uses role-specific party id for role list queries", () => {
		expect(
			listPartyRolesInputSchema.safeParse({
				...queryActor,
				partyId,
			}).success,
		).toBe(true);
		expect(
			listPartyRolesInputSchema.safeParse({
				...queryActor,
				parentId: partyId,
			}).success,
		).toBe(false);
	});

	it("uses one canonical external-id vocabulary for generic and party lookup", () => {
		const input = {
			...queryActor,
			sourceSystem: "legacy-erp",
			externalIdType: "Business_Partner",
			externalValue: "BP-1",
			caseSensitivity: "insensitive",
		};
		const generic = findByExternalIdInputSchema.safeParse(input);
		const party = findPartyByExternalIdInputSchema.safeParse(input);

		expect(generic).toMatchObject({
			success: true,
			data: { externalIdType: "business_partner" },
		});
		expect(party).toEqual(generic);
		expect(
			findByExternalIdInputSchema.safeParse({
				...queryActor,
				system: "legacy-erp",
				namespace: "bp",
				externalId: "BP-1",
			}).success,
		).toBe(false);
	});

	it("keeps lifecycle reason length aligned with lifecycle policy", () => {
		expect(
			partyRoleLifecycleInputSchema.safeParse({
				...actor,
				id: roleId,
				expectedVersion: 1,
				reason: "x".repeat(1_001),
			}).success,
		).toBe(false);
	});
});
