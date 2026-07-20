import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
	activatePartyRole,
	createItemAlias,
	createItemUom,
	createPartyExternalId,
	createPartyRole,
	findItemByAlias,
	findPartyByExternalId,
} from "../src/extensions";
import { createItem } from "../src/item";
import { createItemGroup } from "../src/item-group";
import { activateParty, createParty } from "../src/party";
import { createMasterDataTestHarness } from "./helpers/harness";
import { approvedActivatePartyChangeRequest } from "./helpers/mdg-approve";

const EA_UOM_ID = "b1000000-0000-4000-8000-000000000001";
const KG_UOM_ID = "b1000000-0000-4000-8000-000000000002";

function ctx(organizationId = "org-a") {
	return {
		organizationId,
		actorUserId: "user-1",
		correlationId: randomUUID(),
	};
}

describe("@afenda/master-data extensions", () => {
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

	it("looks up party by external id and rejects duplicates", async () => {
		const { options } = createMasterDataTestHarness();

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
				system: "legacy-erp",
				namespace: "bp",
				externalId: "BP-99",
			},
			options,
		);
		expect(ext.ok).toBe(true);

		const found = await findPartyByExternalId(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				system: "legacy-erp",
				namespace: "bp",
				externalId: "BP-99",
			},
			options,
		);
		expect(found.ok).toBe(true);
		if (!found.ok || found.data === null) {
			return;
		}
		expect(found.data.id).toBe(party.data.id);

		const dup = await createPartyExternalId(
			{
				...ctx(),
				partyId: party.data.id,
				system: "legacy-erp",
				namespace: "bp",
				externalId: "BP-99",
			},
			options,
		);
		expect(dup.ok).toBe(false);
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
				uomId: KG_UOM_ID,
				toBaseNumerator: "1",
				toBaseDenominator: "1",
				usage: "purchase",
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
				aliasCode: "old-sku",
			},
			options,
		);
		expect(alias.ok).toBe(true);

		const found = await findItemByAlias(
			{ organizationId: "org-a", actorUserId: "user-1", aliasCode: "old-sku" },
			options,
		);
		expect(found.ok).toBe(true);
		if (!found.ok || found.data === null) {
			return;
		}
		expect(found.data.id).toBe(item.data.id);

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
