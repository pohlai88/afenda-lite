import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";
import { createItem } from "../src/capabilities/core-organization-masters/item";
import {
	activateItemGroup,
	createItemGroup as createDraftItemGroup,
} from "../src/capabilities/core-organization-masters/item-group";
import {
	activateParty,
	createParty,
	retireParty,
} from "../src/capabilities/core-organization-masters/party";
import {
	activatePartyRole,
	archivePartyRole,
	assertItemUomCompatibility,
	createItemAlias,
	createItemBarcode,
	createItemExternalId,
	createItemUom,
	createPartyAddress,
	createPartyContact,
	createPartyExternalId,
	createPartyRelationship,
	createPartyRole,
	deactivatePartyRole,
	EXTENSION_AGGREGATE_ROOTS,
	findItemByAlias,
	findItemByBarcode,
	findItemByExternalId,
	findPartyByExternalId,
	getPartyAddressById,
	getPartyRole,
	isPartyContactTrustedDestination,
	listActivePartyRoles,
	listItemAliases,
	listItemsByAlias,
	listItemUoms,
	listPartyContacts,
	listPartyRelationships,
	listPartyRoles,
	normalizeBarcode,
	normalizeBarcodePackQuantity,
	normalizeExternalId,
	normalizeItemAlias,
	normalizeItemAliasSource,
	normalizeItemUomConversionFactor,
	normalizePartyContactValue,
	retirePartyRole,
	updatePartyAddress,
	updatePartyContact,
	updatePartyContactVerification,
	updatePartyRole,
} from "../src/capabilities/extensions";
import {
	MAX_EXTERNAL_ID_QUALIFIER_LENGTH,
	MAX_EXTERNAL_ID_VALUE_LENGTH,
} from "../src/capabilities/extensions/external-id-normalization";
import {
	canonicalizePartyRelationship,
	hasCanonicalPartyRelationshipPath,
	hasPartyParentPath,
} from "../src/capabilities/extensions/party-relationship-policy";
import type { PartyContactType } from "../src/types";
import { createMasterDataTestHarness } from "./helpers/harness";
import { approvedActivatePartyChangeRequest } from "./helpers/mdg-approve";

const EA_UOM_ID = "b1000000-0000-4000-8000-000000000001";
const KG_UOM_ID = "b1000000-0000-4000-8000-000000000002";
const CARTON_UOM_ID = "b1000000-0000-4000-8000-000000000008";
const BOX_UOM_ID = "b1000000-0000-4000-8000-000000000009";
const MY_COUNTRY_ID = "c1000000-0000-4000-8000-000000000001";

function ctx(organizationId = "org-a") {
	return {
		organizationId,
		actorUserId: "user-1",
		correlationId: randomUUID(),
	};
}

async function createItemGroup(
	input: ReturnType<typeof ctx> & { code: string; name: string },
	options: NonNullable<Parameters<typeof createDraftItemGroup>[1]>,
) {
	const group = await createDraftItemGroup(input, options);
	if (!group.ok) return group;
	return activateItemGroup(
		{
			...ctx(input.organizationId),
			id: group.data.id,
			expectedVersion: group.data.version,
		},
		options,
	);
}

async function createActivePartyForRelationship(
	input: ReturnType<typeof ctx> & { code: string; name: string },
	options: NonNullable<Parameters<typeof createParty>[1]>,
) {
	const party = await createParty(
		{
			...input,
			partyKind: "organization",
		},
		options,
	);
	if (!party.ok) return party;
	const role = await createPartyRole(
		{
			...ctx(input.organizationId),
			partyId: party.data.id,
			roleCode: "customer",
		},
		options,
	);
	if (!role.ok) return role;
	const activeRole = await activatePartyRole(
		{
			...ctx(input.organizationId),
			id: role.data.id,
			expectedVersion: role.data.version,
		},
		options,
	);
	if (!activeRole.ok) return activeRole;
	const cr = await approvedActivatePartyChangeRequest(
		{ organizationId: input.organizationId, partyId: party.data.id },
		options,
	);
	return activateParty(
		{
			...ctx(input.organizationId),
			id: party.data.id,
			expectedVersion: party.data.version,
			changeRequestId: cr.id,
		},
		options,
	);
}

describe("@afenda/master-data extensions", () => {
	it("normalizes Unicode aliases without applying master-code restrictions", () => {
		expect(normalizeItemAlias("  Café   Crème  ")).toEqual({
			ok: true,
			data: {
				aliasValue: "Café Crème",
				normalizedValue: "café crème",
			},
		});
		expect(normalizeItemAlias("  Fresh   Lettuce  ")).toEqual({
			ok: true,
			data: {
				aliasValue: "Fresh Lettuce",
				normalizedValue: "fresh lettuce",
			},
		});
		expect(normalizeItemAlias("Premium Mix")).toEqual({
			ok: true,
			data: {
				aliasValue: "Premium Mix",
				normalizedValue: "premium mix",
			},
		});
		expect(normalizeItemAlias("Fresh\u0000Lettuce").ok).toBe(false);
	});

	it("canonicalizes item alias source codes without throwing on bad runtime values", () => {
		expect(normalizeItemAliasSource(" Supplier-Catalog ")).toEqual({
			ok: true,
			data: "supplier-catalog",
		});
		expect(normalizeItemAliasSource(null as unknown as string)).toMatchObject({
			ok: false,
			message: "Alias source must be a string",
		});
		expect(normalizeItemAliasSource("supplier catalog")).toMatchObject({
			ok: false,
			message:
				"Alias source must be a valid code of no more than 64 characters",
		});
	});

	it.each([
		["EAN_8", "96385074"],
		["EAN_13", "4006381333931"],
		["UPC_A", "036000291452"],
		["UPC_E", "04252614"],
		["GTIN_14", "10012345000017"],
	] as const)("accepts valid %s barcode checksums", (symbology, rawValue) => {
		const normalized = normalizeBarcode({ symbology, rawValue });
		expect(normalized.ok).toBe(true);
		if (!normalized.ok) return;
		expect(normalized.data.normalizedValue).toBe(rawValue);
	});

	it("normalizes numeric barcode separators while preserving display input", () => {
		expect(
			normalizeBarcode({
				symbology: "EAN_13",
				rawValue: " 400-6381 333931 ",
			}),
		).toEqual({
			ok: true,
			data: {
				barcodeValue: "400-6381 333931",
				normalizedValue: "4006381333931",
			},
		});
	});

	it("returns barcode policy failures instead of throwing on invalid runtime input", () => {
		expect(
			normalizeBarcode({
				rawValue: 12345 as unknown as string,
				symbology: "EAN_13",
			}),
		).toMatchObject({
			ok: false,
			message: "Barcode value must be a string",
		});
		expect(
			normalizeBarcode({
				rawValue: "ABC123",
				symbology: "UNKNOWN" as never,
			}),
		).toMatchObject({
			ok: false,
			message: "Barcode symbology is invalid",
			details: expect.objectContaining({ field: "symbology" }),
		});
		expect(
			normalizeBarcodePackQuantity(null as unknown as string),
		).toMatchObject({
			ok: false,
			details: expect.objectContaining({ field: "packQuantity" }),
		});
	});

	it("enforces barcode comparison policy for generic and CODE_128 symbologies", () => {
		expect(
			normalizeBarcode({
				symbology: "INTERNAL",
				rawValue: " Internal-A1 ",
			}),
		).toEqual({
			ok: true,
			data: {
				barcodeValue: "Internal-A1",
				normalizedValue: "Internal-A1",
			},
		});
		expect(
			normalizeBarcode({
				symbology: "QR",
				rawValue: "QR\u200BVALUE",
			}).ok,
		).toBe(false);
		expect(
			normalizeBarcode({
				symbology: "CODE_128",
				rawValue: "Café",
			}),
		).toMatchObject({
			ok: false,
			message:
				"CODE_128 values in master data must contain 1-128 printable ASCII characters",
		});
	});

	it("canonicalizes barcode pack quantities without numeric conversion", () => {
		expect(normalizeBarcodePackQuantity("0012.5000")).toEqual({
			ok: true,
			data: "12.5",
		});
		expect(normalizeBarcodePackQuantity("000.1000")).toEqual({
			ok: true,
			data: "0.1",
		});
		expect(normalizeBarcodePackQuantity("1.000")).toEqual({
			ok: true,
			data: "1",
		});
		expect(normalizeBarcodePackQuantity("0").ok).toBe(false);
		expect(normalizeBarcodePackQuantity("-1").ok).toBe(false);
		expect(normalizeBarcodePackQuantity("1.1234567890123").ok).toBe(false);
	});

	it("canonicalizes item UoM conversion factors without numeric conversion", () => {
		expect(normalizeItemUomConversionFactor("001.2300")).toEqual({
			ok: true,
			data: "1.23",
		});
		expect(normalizeItemUomConversionFactor("000.0100")).toEqual({
			ok: true,
			data: "0.01",
		});
		expect(normalizeItemUomConversionFactor("1.000")).toEqual({
			ok: true,
			data: "1",
		});
		expect(normalizeItemUomConversionFactor("0").ok).toBe(false);
		expect(normalizeItemUomConversionFactor("0.000001").ok).toBe(true);
		expect(normalizeItemUomConversionFactor("1234567890123").ok).toBe(false);
		expect(normalizeItemUomConversionFactor("1.1234567890123").ok).toBe(false);
		expect(
			normalizeItemUomConversionFactor(null as unknown as string),
		).toMatchObject({
			ok: false,
			details: expect.objectContaining({ field: "conversionFactor" }),
		});
	});

	it("validates item UoM compatibility with field-specific failures", () => {
		expect(
			assertItemUomCompatibility({
				baseDimensionCode: " Count ",
				alternateDimensionCode: "COUNT",
				compatibilityMode: "physical_dimension",
				packagingApprovalReference: null,
			}),
		).toEqual({ ok: true, data: true });
		expect(
			assertItemUomCompatibility({
				baseDimensionCode: "count",
				alternateDimensionCode: "mass",
				compatibilityMode: "physical_dimension",
				packagingApprovalReference: null,
			}),
		).toMatchObject({
			ok: false,
			details: expect.objectContaining({ field: "alternateUomId" }),
		});
		expect(
			assertItemUomCompatibility({
				baseDimensionCode: "count",
				alternateDimensionCode: "count",
				compatibilityMode: "packaging_count",
				packagingApprovalReference: " PACK-APPROVAL ",
			}),
		).toEqual({ ok: true, data: true });
		for (const packagingApprovalReference of ["", "   ", null]) {
			expect(
				assertItemUomCompatibility({
					baseDimensionCode: "count",
					alternateDimensionCode: "count",
					compatibilityMode: "packaging_count",
					packagingApprovalReference,
				}),
			).toMatchObject({
				ok: false,
				details: expect.objectContaining({
					field: "packagingApprovalReference",
				}),
			});
		}
		expect(
			assertItemUomCompatibility({
				baseDimensionCode: "mass",
				alternateDimensionCode: "mass",
				compatibilityMode: "packaging_count",
				packagingApprovalReference: "PACK-APPROVAL",
			}),
		).toMatchObject({
			ok: false,
			details: expect.objectContaining({ field: "compatibilityMode" }),
		});
		expect(
			assertItemUomCompatibility({
				baseDimensionCode: "count",
				alternateDimensionCode: "count",
				compatibilityMode: "physical_dimension",
				packagingApprovalReference: "PACK-APPROVAL",
			}),
		).toMatchObject({
			ok: false,
			details: expect.objectContaining({
				field: "packagingApprovalReference",
			}),
		});
		expect(
			assertItemUomCompatibility({
				baseDimensionCode: "count",
				alternateDimensionCode: "count",
				compatibilityMode: "unknown" as never,
				packagingApprovalReference: null,
			}),
		).toMatchObject({
			ok: false,
			details: expect.objectContaining({ field: "compatibilityMode" }),
		});
	});

	it("normalizes contact values by their contact type", () => {
		expect(
			normalizePartyContactValue("email", " User.Name@EXAMPLE.COM "),
		).toEqual({
			ok: true,
			data: {
				value: "User.Name@EXAMPLE.COM",
				normalizedValue: "User.Name@example.com",
			},
		});
		expect(normalizePartyContactValue("mobile", "+60 (12) 345-6789")).toEqual({
			ok: true,
			data: {
				value: "+60 (12) 345-6789",
				normalizedValue: "+60123456789",
			},
		});
		expect(
			normalizePartyContactValue("website", "HTTPS://Example.COM/contact#team"),
		).toEqual({
			ok: true,
			data: {
				value: "HTTPS://Example.COM/contact#team",
				normalizedValue: "https://example.com/contact",
			},
		});
		expect(normalizePartyContactValue("telephone", "555-0100").ok).toBe(false);
	});

	it("rejects invalid contact type and malformed email domains", () => {
		for (const email of [
			"a@.com",
			"a@example..com",
			"a@example.",
			"a@-example.com",
			"a@example-.com",
		]) {
			expect(normalizePartyContactValue("email", email).ok).toBe(false);
		}

		expect(
			normalizePartyContactValue("pager" as PartyContactType, "12345").ok,
		).toBe(false);
	});

	it("canonicalizes party relationships with deterministic ordering", () => {
		expect(
			canonicalizePartyRelationship({
				sourcePartyId: "party-b",
				targetPartyId: "party-A",
				relationshipType: "related_party",
			}),
		).toMatchObject({
			ok: true,
			data: {
				sourcePartyId: "party-A",
				targetPartyId: "party-b",
				relationshipType: "related_party",
				direction: "symmetric",
			},
		});

		expect(
			canonicalizePartyRelationship({
				sourcePartyId: "parent",
				targetPartyId: "child",
				relationshipType: "subsidiary_of",
			}),
		).toMatchObject({
			ok: true,
			data: {
				sourcePartyId: "child",
				targetPartyId: "parent",
				relationshipType: "parent_of",
				direction: "hierarchical",
			},
		});
	});

	it("checks party relationship paths through stored edges only within one family", () => {
		expect(hasPartyParentPath([], "party-a", "party-a")).toBe(false);
		expect(
			hasPartyParentPath(
				[
					{
						sourcePartyId: "party-a",
						targetPartyId: "party-b",
						relationshipType: "parent_of",
					},
					{
						sourcePartyId: "party-b",
						targetPartyId: "party-c",
						relationshipType: "parent_of",
					},
				],
				"party-a",
				"party-c",
			),
		).toBe(true);
		expect(
			hasPartyParentPath(
				[
					{
						sourcePartyId: "party-a",
						targetPartyId: "party-b",
						relationshipType: "parent_of",
					},
					{
						sourcePartyId: "party-b",
						targetPartyId: "party-c",
						relationshipType: "parent_of",
					},
				],
				"party-c",
				"party-a",
			),
		).toBe(false);
		expect(
			hasPartyParentPath(
				[
					{
						sourcePartyId: "party-a",
						targetPartyId: "party-b",
						relationshipType: "parent_of",
					},
					{
						sourcePartyId: "party-b",
						targetPartyId: "party-c",
						relationshipType: "parent_of",
					},
					{
						sourcePartyId: "party-c",
						targetPartyId: "party-a",
						relationshipType: "parent_of",
					},
				],
				"party-c",
				"party-b",
			),
		).toBe(true);
		expect(
			hasCanonicalPartyRelationshipPath(
				[
					{
						sourcePartyId: "party-a",
						targetPartyId: "party-b",
						relationshipType: "supplies",
					},
					{
						sourcePartyId: "party-b",
						targetPartyId: "party-c",
						relationshipType: "parent_of",
					},
				],
				"parent_of",
				"party-a",
				"party-c",
			),
		).toBe(false);
	});

	it("declares one authoritative aggregate root for every extension", () => {
		expect(EXTENSION_AGGREGATE_ROOTS).toEqual({
			party_role: ["party"],
			party_address: ["party"],
			party_contact: ["party"],
			party_external_id: ["party"],
			party_relationship: ["party", "related_party"],
			item_uom: ["item"],
			item_barcode: ["item"],
			item_external_id: ["item"],
			item_alias: ["item"],
			warehouse_external_id: ["warehouse"],
			item_template_attribute: ["item_template"],
			item_template_attribute_option: ["item_template_attribute"],
			item_variant_attribute_value: ["item_variant"],
		});
	});

	it("governs structured party addresses and atomically replaces a purpose primary", async () => {
		const { options } = createMasterDataTestHarness();
		const party = await createParty(
			{
				...ctx(),
				code: "ADDRESS-OPS",
				name: "Address Operations Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) return;

		const first = await createPartyAddress(
			{
				...ctx(),
				partyId: party.data.id,
				addressType: "physical",
				purpose: "billing",
				line1: "1 First Street",
				line2: "Finance Floor",
				line3: "North Wing",
				city: "Kuala Lumpur",
				administrativeArea: "Wilayah Persekutuan",
				postalCode: "50000",
				countryId: MY_COUNTRY_ID,
				attention: "Accounts Payable",
				isPrimary: true,
				effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
			},
			options,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const second = await createPartyAddress(
			{
				...ctx(),
				partyId: party.data.id,
				addressType: "postal",
				purpose: "billing",
				line1: "2 Replacement Street",
				city: "Kuala Lumpur",
				countryId: MY_COUNTRY_ID,
				isPrimary: true,
			},
			options,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		const previous = await getPartyAddressById(
			{ ...ctx(), partyId: party.data.id, id: first.data.id },
			options,
		);
		expect(previous.ok).toBe(true);
		if (!previous.ok || previous.data === null) return;
		expect(previous.data.isPrimary).toBe(false);
		expect(previous.data.version).toBe(2);
		expect(second.data).toMatchObject({
			purpose: "billing",
			isPrimary: true,
			validationStatus: "unvalidated",
			status: "active",
		});

		const invalidRange = await updatePartyAddress(
			{
				...ctx(),
				id: second.data.id,
				expectedVersion: second.data.version,
				effectiveFrom: new Date("2026-12-31T00:00:00.000Z"),
				effectiveTo: new Date("2026-01-01T00:00:00.000Z"),
			},
			options,
		);
		expect(invalidRange.ok).toBe(false);
	});

	it("rejects a new active party address when its country is inactive", async () => {
		const { store, options } = createMasterDataTestHarness();
		const inactiveCountryId = "c1000000-0000-4000-8000-000000000099";
		store.seedRefs({
			countries: [
				{
					id: inactiveCountryId,
					code: "ZZ",
					alpha3: "ZZZ",
					name: "Inactive Test Country",
					active: false,
				},
			],
		});
		const party = await createParty(
			{
				...ctx(),
				code: "ADDRESS-COUNTRY",
				name: "Address Country Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) return;

		const address = await createPartyAddress(
			{
				...ctx(),
				partyId: party.data.id,
				addressType: "physical",
				purpose: "registered",
				line1: "1 Inactive Country Road",
				city: "Test City",
				countryId: inactiveCountryId,
			},
			options,
		);
		expect(address.ok).toBe(false);
	});

	it("updates and queries controlled party roles while enforcing one active role per type", async () => {
		const { options } = createMasterDataTestHarness();
		const party = await createParty(
			{
				...ctx(),
				code: "ROLE-OPS",
				name: "Role Operations Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) return;
		const first = await createPartyRole(
			{ ...ctx(), partyId: party.data.id, roleCode: "supplier" },
			options,
		);
		const second = await createPartyRole(
			{ ...ctx(), partyId: party.data.id, roleCode: "supplier" },
			options,
		);
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) return;
		const updated = await updatePartyRole(
			{
				...ctx(),
				id: second.data.id,
				expectedVersion: second.data.version,
				roleCode: "employee",
			},
			options,
		);
		expect(updated.ok).toBe(true);
		const active = await activatePartyRole(
			{ ...ctx(), id: first.data.id, expectedVersion: first.data.version },
			options,
		);
		expect(active.ok).toBe(true);
		if (!active.ok) return;
		const duplicate = await createPartyRole(
			{ ...ctx(), partyId: party.data.id, roleCode: "supplier" },
			options,
		);
		expect(duplicate.ok).toBe(true);
		if (!duplicate.ok) return;
		const duplicateActivation = await activatePartyRole(
			{
				...ctx(),
				id: duplicate.data.id,
				expectedVersion: duplicate.data.version,
			},
			options,
		);
		expect(duplicateActivation.ok).toBe(false);

		const fetched = await getPartyRole(
			{ ...ctx(), partyId: party.data.id, id: first.data.id },
			options,
		);
		expect(fetched).toEqual({ ok: true, data: active.data });
		const activeRoles = await listActivePartyRoles(
			{ ...ctx(), partyId: party.data.id },
			options,
		);
		expect(activeRoles.ok).toBe(true);
		if (!activeRoles.ok) return;
		expect(activeRoles.data.items.map((role) => role.id)).toEqual([
			first.data.id,
		]);
	});

	it("replaces the primary contact atomically and requires explicit verification for trust", async () => {
		const { options, store } = createMasterDataTestHarness();
		const party = await createParty(
			{
				...ctx(),
				code: "PRIMARY-CONTACT",
				name: "Primary Contact Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) return;

		const first = await createPartyContact(
			{
				...ctx(),
				partyId: party.data.id,
				contactType: "email",
				value: "First@EXAMPLE.test",
				label: "Accounts payable",
				purpose: "billing",
				isPrimary: true,
			},
			options,
		);
		expect(first.ok).toBe(true);

		const replacement = await createPartyContact(
			{
				...ctx(),
				partyId: party.data.id,
				contactType: "email",
				value: "second@example.test",
				purpose: "billing",
				isPrimary: true,
			},
			options,
		);
		expect(replacement.ok).toBe(true);
		if (!first.ok || !replacement.ok) return;
		expect(replacement.data.maskedValue.endsWith("test")).toBe(true);
		expect(replacement.data).not.toHaveProperty("normalizedValue");

		const contacts = await listPartyContacts(
			{ ...ctx(), parentId: party.data.id },
			options,
		);
		expect(contacts.ok).toBe(true);
		if (!contacts.ok) return;
		const previous = contacts.data.find(
			(contact) => contact.id === first.data.id,
		);
		expect(previous).toMatchObject({ isPrimary: false, version: 2 });

		const verifiedAt = new Date("2026-05-06T07:08:09.000Z");
		options.ports.clock.set(verifiedAt);
		const verified = await updatePartyContactVerification(
			{
				...ctx(),
				id: replacement.data.id,
				expectedVersion: replacement.data.version,
				verificationStatus: "verified",
			},
			options,
		);
		expect(verified.ok).toBe(true);
		if (!verified.ok) return;
		expect(verified.data.verificationStatus).toBe("verified");
		const verifiedContact = await store.getPrimaryPartyContact(
			ctx().organizationId,
			party.data.id,
			"email",
			"billing",
		);
		expect(verifiedContact.ok).toBe(true);
		if (!verifiedContact.ok || verifiedContact.data === null) return;
		expect(verifiedContact.data.verifiedAt).toEqual(verifiedAt);
		expect(isPartyContactTrustedDestination(verifiedContact.data)).toBe(true);
		expect(
			isPartyContactTrustedDestination(
				verifiedContact.data,
				new Date("invalid"),
			),
		).toBe(false);
		expect(
			isPartyContactTrustedDestination(
				{
					...verifiedContact.data,
					verifiedAt: new Date(Date.now() + 60_000),
				},
				new Date(),
			),
		).toBe(false);

		const changedValue = await updatePartyContact(
			{
				...ctx(),
				id: verified.data.id,
				expectedVersion: verified.data.version,
				contactType: "email",
				value: "Replacement@EXAMPLE.TEST",
			},
			options,
		);
		expect(changedValue.ok).toBe(true);
		if (!changedValue.ok) return;
		expect(changedValue.data).toMatchObject({
			verificationStatus: "unverified",
		});
		expect(changedValue.data).not.toHaveProperty("normalizedValue");
		const changedContact = await store.getPrimaryPartyContact(
			ctx().organizationId,
			party.data.id,
			"email",
			"billing",
		);
		expect(changedContact.ok).toBe(true);
		if (!changedContact.ok || changedContact.data === null) return;
		expect(changedContact.data).toMatchObject({
			normalizedValue: "Replacement@example.test",
			verificationStatus: "unverified",
			verifiedAt: null,
		});
		expect(isPartyContactTrustedDestination(changedContact.data)).toBe(false);
	});

	it("rejects cross-organization and retired party extension parents", async () => {
		const { options } = createMasterDataTestHarness();
		const party = await createParty(
			{
				...ctx("org-a"),
				code: "BOUNDARY",
				name: "Boundary Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) return;

		const crossOrg = await createPartyRole(
			{
				...ctx("org-b"),
				partyId: party.data.id,
				roleCode: "customer",
			},
			options,
		);
		expect(crossOrg.ok).toBe(false);

		const retired = await retireParty(
			{
				...ctx("org-a"),
				id: party.data.id,
				expectedVersion: party.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) return;

		const afterRetirement = await createPartyRole(
			{
				...ctx("org-a"),
				partyId: party.data.id,
				roleCode: "customer",
			},
			options,
		);
		expect(afterRetirement.ok).toBe(false);
		if (afterRetirement.ok) return;
		expect((afterRetirement.details as { reason?: string }).reason).toBe(
			"MASTER_INVALID_STATE",
		);
	});

	it("blocks party activation without an active role", async () => {
		const { options } = createMasterDataTestHarness();

		const party = await createParty(
			{
				...ctx(),
				code: "NOROLE",
				name: "No Role Co",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) {
			return;
		}

		const cr = await approvedActivatePartyChangeRequest(
			{ organizationId: ctx().organizationId, partyId: party.data.id },
			options,
		);
		const activated = await activateParty(
			{
				...ctx(),
				id: party.data.id,
				expectedVersion: party.data.version,
				changeRequestId: cr.id,
			},
			options,
		);
		expect(activated.ok).toBe(false);
		if (activated.ok) {
			return;
		}
		expect((activated.details as { reason?: string }).reason).toBe(
			"MASTER_INVALID_STATE",
		);
	});

	it("rejects removing the final active role of an active party", async () => {
		const { options } = createMasterDataTestHarness();

		async function createActivePartyWithOneRole(code: string) {
			const party = await createParty(
				{
					...ctx(),
					code,
					name: `${code} Co`,
					partyKind: "organization",
				},
				options,
			);
			expect(party.ok).toBe(true);
			if (!party.ok) return null;

			const role = await createPartyRole(
				{
					...ctx(),
					partyId: party.data.id,
					roleCode: "customer",
				},
				options,
			);
			expect(role.ok).toBe(true);
			if (!role.ok) return null;

			const activatedRole = await activatePartyRole(
				{
					...ctx(),
					id: role.data.id,
					expectedVersion: role.data.version,
				},
				options,
			);
			expect(activatedRole.ok).toBe(true);
			if (!activatedRole.ok) return null;

			const cr = await approvedActivatePartyChangeRequest(
				{ organizationId: ctx().organizationId, partyId: party.data.id },
				options,
			);
			const activatedParty = await activateParty(
				{
					...ctx(),
					id: party.data.id,
					expectedVersion: party.data.version,
					changeRequestId: cr.id,
				},
				options,
			);
			expect(activatedParty.ok).toBe(true);
			if (!activatedParty.ok) return null;
			return activatedRole.data;
		}

		const lifecycleAttempts = [
			{
				code: "FINALROLE-INACTIVE",
				run: deactivatePartyRole,
				reason: "Role is temporarily suspended",
			},
			{
				code: "FINALROLE-ARCHIVE",
				run: archivePartyRole,
				reason: "Role is archived",
			},
			{
				code: "FINALROLE-RETIRE",
				run: retirePartyRole,
				reason: "Role is no longer applicable",
			},
		] as const;

		for (const attempt of lifecycleAttempts) {
			const activeRole = await createActivePartyWithOneRole(attempt.code);
			if (activeRole === null) return;
			const result = await attempt.run(
				{
					...ctx(),
					id: activeRole.id,
					expectedVersion: activeRole.version,
					reason: attempt.reason,
				},
				options,
			);
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect((result.details as { reason?: string }).reason).toBe(
				"MASTER_FINAL_ACTIVE_ROLE",
			);
		}
	});

	it("uses reasoned standard lifecycle transitions and keeps archived roles readable", async () => {
		const { options } = createMasterDataTestHarness();
		const party = await createParty(
			{
				...ctx(),
				code: "ROLE-LIFECYCLE",
				name: "Role Lifecycle Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) return;
		const role = await createPartyRole(
			{ ...ctx(), partyId: party.data.id, roleCode: "supplier" },
			options,
		);
		expect(role.ok).toBe(true);
		if (!role.ok) return;
		const active = await activatePartyRole(
			{ ...ctx(), id: role.data.id, expectedVersion: role.data.version },
			options,
		);
		expect(active.ok).toBe(true);
		if (!active.ok) return;

		const missingReason = await deactivatePartyRole(
			{ ...ctx(), id: active.data.id, expectedVersion: active.data.version },
			options,
		);
		expect(missingReason.ok).toBe(false);

		const inactive = await deactivatePartyRole(
			{
				...ctx(),
				id: active.data.id,
				expectedVersion: active.data.version,
				reason: "Supplier relationship suspended",
			},
			options,
		);
		expect(inactive.ok).toBe(true);
		if (!inactive.ok) return;
		const retired = await retirePartyRole(
			{
				...ctx(),
				id: inactive.data.id,
				expectedVersion: inactive.data.version,
				reason: "Supplier relationship closed",
			},
			options,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) return;
		expect(retired.data).toMatchObject({
			status: "retired",
			retiredBy: ctx().actorUserId,
		});
		expect(retired.data.retiredAt).toBeInstanceOf(Date);

		const archived = await archivePartyRole(
			{
				...ctx(),
				id: retired.data.id,
				expectedVersion: retired.data.version,
				reason: "Supplier relationship archived",
			},
			options,
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) return;
		expect(archived.data.status).toBe("archived");

		const listed = await listPartyRoles(
			{ ...ctx(), partyId: party.data.id },
			options,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.data.items).toContainEqual(
			expect.objectContaining({ id: role.data.id, status: "archived" }),
		);
	});

	it("looks up party by external id and rejects duplicates", async () => {
		const { options, store } = createMasterDataTestHarness();

		const party = await createParty(
			{
				...ctx(),
				code: "EXT1",
				name: "External Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) {
			return;
		}

		const ext = await createPartyExternalId(
			{
				...ctx(),
				partyId: party.data.id,
				sourceSystem: "legacy-erp",
				externalIdType: "bp",
				externalValue: "BP-99",
				caseSensitivity: "insensitive",
				isPrimary: true,
			},
			options,
		);
		expect(ext.ok).toBe(true);

		const found = await findPartyByExternalId(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				sourceSystem: "legacy-erp",
				externalIdType: "bp",
				externalValue: "bp-99",
				caseSensitivity: "insensitive",
			},
			options,
		);
		expect(found.ok).toBe(true);
		if (!found.ok || found.data === null) {
			return;
		}
		expect(found.data.id).toBe(party.data.id);

		const sensitive = await createPartyExternalId(
			{
				...ctx(),
				partyId: party.data.id,
				sourceSystem: "case-src",
				externalIdType: "case-type",
				externalValue: "Case-1",
				caseSensitivity: "sensitive",
				isPrimary: false,
			},
			options,
		);
		expect(sensitive.ok).toBe(true);
		const mismatchedPolicy = await findPartyByExternalId(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				sourceSystem: "case-src",
				externalIdType: "case-type",
				externalValue: "case-1",
				caseSensitivity: "insensitive",
			},
			options,
		);
		expect(mismatchedPolicy).toMatchObject({ ok: true, data: null });

		const otherParty = await createParty(
			{
				...ctx(),
				code: "PARTY-EXT-OTHER",
				name: "Other external-id party",
				partyKind: "organization",
			},
			options,
		);
		expect(otherParty.ok).toBe(true);
		if (!otherParty.ok) return;

		const dup = await createPartyExternalId(
			{
				...ctx(),
				partyId: otherParty.data.id,
				sourceSystem: "legacy-erp",
				externalIdType: "bp",
				externalValue: "bp-99",
				caseSensitivity: "insensitive",
				isPrimary: false,
			},
			options,
		);
		expect(dup.ok).toBe(false);
		if (!dup.ok) {
			expect(dup.details).toMatchObject({
				reason: "MASTER_EXTERNAL_ID_CONFLICT",
			});
		}

		const partyExternalIds = Reflect.get(store, "partyExternalIds");
		expect(partyExternalIds).toBeInstanceOf(Map);
		if (!(partyExternalIds instanceof Map)) return;
		partyExternalIds.set(randomUUID(), {
			...ext.data,
			id: randomUUID(),
			partyId: otherParty.data.id,
		});
		const ambiguous = await findPartyByExternalId(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				sourceSystem: "legacy-erp",
				externalIdType: "bp",
				externalValue: "bp-99",
				caseSensitivity: "insensitive",
			},
			options,
		);
		expect(ambiguous.ok).toBe(false);
		if (!ambiguous.ok) {
			expect(ambiguous.details).toMatchObject({
				reason: "MASTER_EXTERNAL_ID_CONFLICT",
			});
		}
	});

	it("normalizes external identifiers according to explicit case policy", () => {
		const insensitive = normalizeExternalId({
			sourceSystem: " Legacy-ERP ",
			externalIdType: " Business_Partner ",
			externalValue: " Acme-42 ",
			caseSensitivity: "insensitive",
		});
		expect(insensitive).toMatchObject({
			ok: true,
			data: {
				sourceSystem: "legacy-erp",
				externalIdType: "business_partner",
				externalValue: "Acme-42",
				normalizedValue: "ACME-42",
			},
		});

		const sensitive = normalizeExternalId({
			sourceSystem: "legacy-erp",
			externalIdType: "business_partner",
			externalValue: "Acme-42",
			caseSensitivity: "sensitive",
		});
		expect(sensitive).toMatchObject({
			ok: true,
			data: { normalizedValue: "Acme-42" },
		});
	});

	it("enforces external-id qualifier and value invariants inside the normalizer", () => {
		const uppercaseQualifier = normalizeExternalId({
			sourceSystem: "SAP-S4",
			externalIdType: "Customer.ID",
			externalValue: "  C-100  ",
			caseSensitivity: "sensitive",
		});
		expect(uppercaseQualifier).toMatchObject({
			ok: true,
			data: {
				sourceSystem: "sap-s4",
				externalIdType: "customer.id",
				externalValue: "C-100",
				normalizedValue: "C-100",
			},
		});

		const longQualifier = normalizeExternalId({
			sourceSystem: "s".repeat(MAX_EXTERNAL_ID_QUALIFIER_LENGTH + 1),
			externalIdType: "customer",
			externalValue: "C-100",
			caseSensitivity: "sensitive",
		});
		expect(longQualifier).toMatchObject({
			ok: false,
			details: {
				reason: "MASTER_VALIDATION_FAILED",
				field: "sourceSystem",
				maxLength: MAX_EXTERNAL_ID_QUALIFIER_LENGTH,
			},
		});

		const invalidQualifier = normalizeExternalId({
			sourceSystem: "sap s4",
			externalIdType: "customer",
			externalValue: "C-100",
			caseSensitivity: "sensitive",
		});
		expect(invalidQualifier).toMatchObject({
			ok: false,
			message: "sourceSystem must be a valid external-ID qualifier code",
		});

		const longValue = normalizeExternalId({
			sourceSystem: "sap",
			externalIdType: "customer",
			externalValue: "x".repeat(MAX_EXTERNAL_ID_VALUE_LENGTH + 1),
			caseSensitivity: "sensitive",
		});
		expect(longValue).toMatchObject({
			ok: false,
			details: {
				field: "externalValue",
				maxLength: MAX_EXTERNAL_ID_VALUE_LENGTH,
			},
		});
	});

	it("inserts base UoM conversion factor 1 on item create", async () => {
		const { options } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{ ...ctx(), code: "G-BASE", name: "Base Group" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}

		const item = await createItem(
			{
				...ctx(),
				code: "SKU-BASE",
				name: "Base Item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) {
			return;
		}

		const uoms = await listItemUoms(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				itemId: item.data.id,
			},
			options,
		);
		expect(uoms.ok).toBe(true);
		if (!uoms.ok) {
			return;
		}
		const base = uoms.data.items.find(
			(row) => row.alternateUomId === EA_UOM_ID,
		);
		expect(base).toBeDefined();
		expect(base?.conversionFactor).toBe("1");
		expect(base?.isInventoryUom).toBe(true);
	});

	it("canonicalizes party relationships and prevents hierarchy cycles", async () => {
		const { options } = createMasterDataTestHarness();

		const from = await createActivePartyForRelationship(
			{ ...ctx(), code: "REL-A", name: "Rel A" },
			options,
		);
		const to = await createActivePartyForRelationship(
			{ ...ctx(), code: "REL-B", name: "Rel B" },
			options,
		);
		expect(from.ok && to.ok).toBe(true);
		if (!from.ok || !to.ok) {
			return;
		}

		const bad = await createPartyRelationship(
			{
				...ctx(),
				sourcePartyId: from.data.id,
				targetPartyId: to.data.id,
				relationshipType: "invented_edge",
			},
			options,
		);
		expect(bad.ok).toBe(false);

		const okRel = await createPartyRelationship(
			{
				...ctx(),
				sourcePartyId: from.data.id,
				targetPartyId: to.data.id,
				relationshipType: "parent_of",
				effectiveFrom: "2026-01-01T00:00:00.000Z",
				effectiveTo: "2026-12-31T00:00:00.000Z",
			},
			options,
		);
		expect(okRel.ok).toBe(true);
		if (!okRel.ok) return;
		expect(okRel.data).toMatchObject({
			sourcePartyId: from.data.id,
			targetPartyId: to.data.id,
			relationshipType: "parent_of",
			direction: "hierarchical",
		});

		const inverseDuplicate = await createPartyRelationship(
			{
				...ctx(),
				sourcePartyId: to.data.id,
				targetPartyId: from.data.id,
				relationshipType: "subsidiary_of",
			},
			options,
		);
		expect(inverseDuplicate.ok).toBe(false);

		const third = await createActivePartyForRelationship(
			{ ...ctx(), code: "REL-C", name: "Rel C" },
			options,
		);
		expect(third.ok).toBe(true);
		if (!third.ok) return;

		const secondEdge = await createPartyRelationship(
			{
				...ctx(),
				sourcePartyId: to.data.id,
				targetPartyId: third.data.id,
				relationshipType: "parent_of",
			},
			options,
		);
		expect(secondEdge.ok).toBe(true);
		if (!secondEdge.ok) return;

		const cycle = await createPartyRelationship(
			{
				...ctx(),
				sourcePartyId: third.data.id,
				targetPartyId: from.data.id,
				relationshipType: "parent_of",
			},
			options,
		);
		expect(cycle).toMatchObject({
			ok: false,
			details: { reason: "MASTER_RELATIONSHIP_CYCLE" },
		});

		const symmetric = await createPartyRelationship(
			{
				...ctx(),
				sourcePartyId: to.data.id,
				targetPartyId: from.data.id,
				relationshipType: "related_party",
			},
			options,
		);
		expect(symmetric).toMatchObject({
			ok: true,
			data: {
				sourcePartyId: [from.data.id, to.data.id].sort()[0],
				targetPartyId: [from.data.id, to.data.id].sort()[1],
				direction: "symmetric",
			},
		});

		const listedForTarget = await listPartyRelationships(
			{
				...ctx(),
				partyId: to.data.id,
				page: 1,
				pageSize: 2,
			},
			options,
		);
		expect(listedForTarget.ok).toBe(true);
		if (!listedForTarget.ok) return;
		expect(listedForTarget.data).toMatchObject({
			page: 1,
			pageSize: 2,
			hasNextPage: true,
		});
		expect(listedForTarget.data.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: okRel.data.id,
					sourcePartyId: from.data.id,
					targetPartyId: to.data.id,
					relationshipType: "parent_of",
				}),
				expect.objectContaining({
					id: secondEdge.data.id,
					sourcePartyId: to.data.id,
					targetPartyId: third.data.id,
					relationshipType: "parent_of",
				}),
			]),
		);

		const emptyPage = await listPartyRelationships(
			{
				...ctx(),
				partyId: to.data.id,
				page: 3,
				pageSize: 2,
			},
			options,
		);
		expect(emptyPage).toMatchObject({
			ok: true,
			data: {
				items: [],
				page: 3,
				pageSize: 2,
				hasNextPage: false,
			},
		});

		const invalidRange = await createPartyRelationship(
			{
				...ctx(),
				sourcePartyId: from.data.id,
				targetPartyId: third.data.id,
				relationshipType: "supplies",
				effectiveFrom: "2026-12-31T00:00:00.000Z",
				effectiveTo: "2026-01-01T00:00:00.000Z",
			},
			options,
		);
		expect(invalidRange.ok).toBe(false);
	});

	it("enforces item UoM rounding scale and packaging approval", async () => {
		const { options } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{ ...ctx(), code: "G-ROUND", name: "Round Group" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}
		const item = await createItem(
			{
				...ctx(),
				code: "SKU-ROUND",
				name: "Round Item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) {
			return;
		}

		const bad = await createItemUom(
			{
				...ctx(),
				itemId: item.data.id,
				alternateUomId: CARTON_UOM_ID,
				conversionFactor: "12",
				roundingScale: 13,
				compatibilityMode: "packaging_count",
				packagingApprovalReference: "PACK-APPROVAL-1",
			},
			options,
		);
		expect(bad.ok).toBe(false);

		const good = await createItemUom(
			{
				...ctx(),
				itemId: item.data.id,
				alternateUomId: CARTON_UOM_ID,
				conversionFactor: "24",
				roundingScale: 0,
				isPurchaseUom: true,
				isSalesUom: true,
				isDefaultPurchaseUom: true,
				isDefaultSalesUom: true,
				compatibilityMode: "packaging_count",
				packagingApprovalReference: "PACK-APPROVAL-1",
			},
			options,
		);
		expect(good.ok).toBe(true);
		if (!good.ok) return;

		const replacement = await createItemUom(
			{
				...ctx(),
				itemId: item.data.id,
				alternateUomId: BOX_UOM_ID,
				conversionFactor: "6",
				isPurchaseUom: true,
				isSalesUom: true,
				isDefaultPurchaseUom: true,
				isDefaultSalesUom: true,
			},
			options,
		);
		expect(replacement.ok).toBe(true);

		const rows = await listItemUoms(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				itemId: item.data.id,
			},
			options,
		);
		expect(rows.ok).toBe(true);
		if (!rows.ok) return;
		const formerDefault = rows.data.items.find(
			(row) => row.alternateUomId === CARTON_UOM_ID,
		);
		const currentDefault = rows.data.items.find(
			(row) => row.alternateUomId === BOX_UOM_ID,
		);
		expect(formerDefault).toMatchObject({
			isDefaultPurchaseUom: false,
			isDefaultSalesUom: false,
			version: 2,
		});
		expect(currentDefault).toMatchObject({
			isDefaultPurchaseUom: true,
			isDefaultSalesUom: true,
		});
	});

	it("rejects zero and out-of-precision item UoM conversion factors", async () => {
		const { options } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{ ...ctx(), code: "G-FACTOR", name: "Factor Group" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}

		const item = await createItem(
			{
				...ctx(),
				code: "SKU-FACTOR",
				name: "Factor Item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) {
			return;
		}

		const zero = await createItemUom(
			{
				...ctx(),
				itemId: item.data.id,
				alternateUomId: CARTON_UOM_ID,
				conversionFactor: "0",
			},
			options,
		);
		expect(zero.ok).toBe(false);

		const excessiveScale = await createItemUom(
			{
				...ctx(),
				itemId: item.data.id,
				alternateUomId: CARTON_UOM_ID,
				conversionFactor: "1.1234567890123",
			},
			options,
		);
		expect(excessiveScale.ok).toBe(false);
	});

	it("rejects item UoM when dimension mismatches base UoM", async () => {
		const { options } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{ ...ctx(), code: "G1", name: "Group" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}

		const item = await createItem(
			{
				...ctx(),
				code: "SKU-DIM",
				name: "Dim Item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) {
			return;
		}

		const bad = await createItemUom(
			{
				...ctx(),
				itemId: item.data.id,
				alternateUomId: KG_UOM_ID,
				conversionFactor: "1",
			},
			options,
		);
		expect(bad.ok).toBe(false);
		if (bad.ok) {
			return;
		}
		expect((bad.details as { reason?: string }).reason).toBe(
			"MASTER_INVALID_UOM_CONVERSION",
		);
	});

	it("rejects creating an alternate item UoM for the item's base UoM", async () => {
		const { options } = createMasterDataTestHarness();
		const group = await createItemGroup(
			{ ...ctx(), code: "G-BASE-DUP", name: "Base Duplicate Group" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) return;
		const item = await createItem(
			{
				...ctx(),
				code: "SKU-BASE-DUP",
				name: "Base Duplicate Item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) return;

		const duplicateBase = await createItemUom(
			{
				...ctx(),
				itemId: item.data.id,
				alternateUomId: EA_UOM_ID,
				conversionFactor: "1",
			},
			options,
		);
		expect(duplicateBase.ok).toBe(false);
		if (duplicateBase.ok) return;
		expect(duplicateBase.details).toMatchObject({
			reason: "MASTER_INVALID_UOM_CONVERSION",
			field: "alternateUomId",
		});
	});

	it("creates item barcodes only for valid item UoM packaging and resolves by normalized value", async () => {
		const { options } = createMasterDataTestHarness();
		const group = await createItemGroup(
			{ ...ctx(), code: "G-BARCODE", name: "Barcode Group" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) return;
		const item = await createItem(
			{
				...ctx(),
				code: "SKU-BARCODE",
				name: "Barcode Item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) return;

		const invalidPackaging = await createItemBarcode(
			{
				...ctx(),
				itemId: item.data.id,
				barcodeValue: "4006381333931",
				symbology: "EAN_13",
				uomId: CARTON_UOM_ID,
				packQuantity: "24",
			},
			options,
		);
		expect(invalidPackaging.ok).toBe(false);

		const itemUom = await createItemUom(
			{
				...ctx(),
				itemId: item.data.id,
				alternateUomId: CARTON_UOM_ID,
				conversionFactor: "24",
				compatibilityMode: "packaging_count",
				packagingApprovalReference: "PACK-BARCODE-1",
			},
			options,
		);
		expect(itemUom.ok).toBe(true);
		if (!itemUom.ok) return;

		const barcode = await createItemBarcode(
			{
				...ctx(),
				itemId: item.data.id,
				barcodeValue: "400-6381 333931",
				symbology: "EAN_13",
				uomId: CARTON_UOM_ID,
				packQuantity: "024.000",
				isPrimary: true,
			},
			options,
		);
		expect(barcode.ok).toBe(true);
		if (!barcode.ok) return;
		expect(barcode.data).toMatchObject({
			barcodeValue: "400-6381 333931",
			normalizedValue: "4006381333931",
			packQuantity: "24",
			isPrimary: true,
		});

		const found = await findItemByBarcode(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				barcodeValue: "4006381333931",
				symbology: "EAN_13",
			},
			options,
		);
		expect(found.ok).toBe(true);
		if (!found.ok || found.data === null) return;
		expect(found.data.id).toBe(item.data.id);
	});

	it("creates and resolves item external IDs through the neutral normalization policy", async () => {
		const { options } = createMasterDataTestHarness();
		const group = await createItemGroup(
			{ ...ctx(), code: "G-ITEM-EXT", name: "Item External Group" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) return;
		const item = await createItem(
			{
				...ctx(),
				code: "SKU-ITEM-EXT",
				name: "External ID Item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) return;

		const created = await createItemExternalId(
			{
				...ctx(),
				itemId: item.data.id,
				sourceSystem: " SAP-S4 ",
				externalIdType: " Material.ID ",
				externalValue: " mat-100 ",
				caseSensitivity: "insensitive",
				isPrimary: true,
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		expect(created.data).toMatchObject({
			sourceSystem: "sap-s4",
			externalIdType: "material.id",
			externalValue: "mat-100",
			normalizedValue: "MAT-100",
			caseSensitivity: "insensitive",
			isPrimary: true,
		});

		const found = await findItemByExternalId(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				sourceSystem: "sap-s4",
				externalIdType: "material.id",
				externalValue: "MAT-100",
				caseSensitivity: "insensitive",
			},
			options,
		);
		expect(found.ok).toBe(true);
		if (!found.ok || found.data === null) return;
		expect(found.data.id).toBe(item.data.id);
	});

	it("resolves item by alias and bounds list pageSize", async () => {
		const { options } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{ ...ctx(), code: "G2", name: "Group 2" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}
		const item = await createItem(
			{
				...ctx(),
				code: "SKU-ALIAS",
				name: "Alias Item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) {
			return;
		}

		const alias = await createItemAlias(
			{
				...ctx(),
				itemId: item.data.id,
				aliasType: "legacy_name",
				aliasValue: "old-sku",
				source: "migration",
			},
			options,
		);
		expect(alias.ok).toBe(true);

		const found = await findItemByAlias(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				aliasType: "legacy_name",
				aliasValue: "old-sku",
			},
			options,
		);
		expect(found.ok).toBe(true);
		if (!found.ok || found.data === null) {
			return;
		}
		expect(found.data.id).toBe(item.data.id);

		const aliases = await listItemAliases(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				itemId: item.data.id,
				page: 1,
				pageSize: 10,
			},
			options,
		);
		expect(aliases.ok).toBe(true);
		if (!aliases.ok) {
			return;
		}
		expect(aliases.data.items).toHaveLength(1);
		expect(aliases.data.items[0]?.itemId).toBe(item.data.id);
		expect(aliases.data.hasNextPage).toBe(false);

		const search = await listItemsByAlias(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				aliasType: "legacy_name",
				aliasValue: "old-sku",
				page: 1,
				pageSize: 1,
			},
			options,
		);
		expect(search.ok).toBe(true);
		if (!search.ok) {
			return;
		}
		expect(search.data.items.map((row) => row.id)).toEqual([item.data.id]);
		expect(search.data.page).toBe(1);
		expect(search.data.pageSize).toBe(1);

		const secondItem = await createItem(
			{
				...ctx(),
				code: "SKU-ALIAS-2",
				name: "Alias Item 2",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(secondItem.ok).toBe(true);
		if (!secondItem.ok) {
			return;
		}
		const secondAlias = await createItemAlias(
			{
				...ctx(),
				itemId: secondItem.data.id,
				aliasType: "legacy_name",
				aliasValue: "old-sku",
				source: "migration",
			},
			options,
		);
		expect(secondAlias.ok).toBe(true);

		const ambiguousSearch = await listItemsByAlias(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				aliasType: "legacy_name",
				aliasValue: "old-sku",
				page: 1,
				pageSize: 1,
			},
			options,
		);
		expect(ambiguousSearch.ok).toBe(true);
		if (!ambiguousSearch.ok) {
			return;
		}
		expect(ambiguousSearch.data.items).toHaveLength(1);
		expect(ambiguousSearch.data.hasNextPage).toBe(true);

		const ambiguousFind = await findItemByAlias(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				aliasType: "legacy_name",
				aliasValue: "old-sku",
			},
			options,
		);
		expect(ambiguousFind.ok).toBe(false);

		const party = await createParty(
			{
				...ctx(),
				code: "ROLEP",
				name: "Role Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) {
			return;
		}
		const role = await createPartyRole(
			{ ...ctx(), partyId: party.data.id, roleCode: "supplier" },
			options,
		);
		expect(role.ok).toBe(true);
		if (!role.ok) {
			return;
		}
		const activatedRole = await activatePartyRole(
			{
				...ctx(),
				id: role.data.id,
				expectedVersion: role.data.version,
			},
			options,
		);
		expect(activatedRole.ok).toBe(true);
	});
});
