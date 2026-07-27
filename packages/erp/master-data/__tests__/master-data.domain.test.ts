import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";
import {
	activateItem,
	createItem,
	inactiveItem,
	updateItem,
} from "../src/capabilities/core-organization-masters/item";
import {
	activateItemGroup,
	createItemGroup,
	inactiveItemGroup,
	retireItemGroup,
	updateItemGroup,
} from "../src/capabilities/core-organization-masters/item-group";
import {
	activateParty,
	createParty,
	getPartyById,
	inactiveParty,
	restoreParty,
	retireParty,
	updateParty,
} from "../src/capabilities/core-organization-masters/party";
import {
	activatePaymentTerm,
	createPaymentTerm,
	getPaymentTermByCode,
	inactivePaymentTerm,
	listPaymentTerms,
	retirePaymentTerm,
	updatePaymentTerm,
} from "../src/capabilities/core-organization-masters/payment-term";
import { masterListOptionsSchema } from "../src/capabilities/core-organization-masters/schemas";
import {
	activateTaxRegistration,
	blockTaxRegistration,
	createTaxRegistration,
	findTaxRegistrationsByParty,
	listTaxRegistrations,
	restoreTaxRegistration,
	retireTaxRegistration,
	updateTaxRegistration,
} from "../src/capabilities/core-organization-masters/tax-registration";
import { normalizeTaxRegistrationNumber } from "../src/capabilities/core-organization-masters/tax-registration-number";
import { validityRangesOverlap } from "../src/capabilities/core-organization-masters/validity-overlap";
import {
	activateWarehouse,
	createWarehouse,
	inactiveWarehouse,
	moveWarehouse,
	retireWarehouse,
	updateWarehouse,
} from "../src/capabilities/core-organization-masters/warehouse";
import {
	activatePartyRole,
	createPartyRole,
} from "../src/capabilities/extensions";
import type { DependencyInspector, RefUom } from "../src/types";
import { createMasterDataTestHarness } from "./helpers/harness";
import { approvedActivatePartyChangeRequest } from "./helpers/mdg-approve";
import type { createMemoryMasterDataStore } from "./helpers/memory-master-data-store";
import type { createMemoryMutationPorts } from "./helpers/memory-ports";

const EA_UOM_ID = "b1000000-0000-4000-8000-000000000001";

function ctx(organizationId = "org-a") {
	return {
		organizationId,
		actorUserId: "user-1",
		correlationId: randomUUID(),
	};
}

async function withActiveCustomerRole(
	partyId: string,
	options: {
		store: ReturnType<typeof createMemoryMasterDataStore>;
		ports: ReturnType<typeof createMemoryMutationPorts>;
	},
) {
	const role = await createPartyRole(
		{
			...ctx(),
			partyId,
			roleCode: "customer",
		},
		options,
	);
	expect(role.ok).toBe(true);
	if (!role.ok) {
		return role;
	}
	return activatePartyRole(
		{
			...ctx(),
			id: role.data.id,
			expectedVersion: role.data.version,
		},
		options,
	);
}

describe("@afenda/master-data domain", () => {
	it("UoM spine: create item group + item with baseUomId EA", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{
				...ctx(),
				code: "FG",
				name: "Finished goods",
			},
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}
		const activeGroup = await activateItemGroup(
			{
				...ctx(),
				id: group.data.id,
				expectedVersion: group.data.version,
			},
			options,
		);
		expect(activeGroup.ok).toBe(true);
		if (!activeGroup.ok) return;

		const item = await createItem(
			{
				...ctx(),
				code: "SKU-1",
				name: "Widget",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: activeGroup.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) {
			return;
		}
		expect(item.data.baseUomId).toBe(EA_UOM_ID);
		expect(item.data.itemGroupId).toBe(activeGroup.data.id);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.item.created.v1",
			),
		).toBe(true);
	});

	it("activateItem revalidates the base UoM is still active", async () => {
		const { options, store } = createMasterDataTestHarness();
		const group = await createItemGroup(
			{ ...ctx(), code: "UOM-ACT", name: "UoM activation" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) return;
		const activeGroup = await activateItemGroup(
			{ ...ctx(), id: group.data.id, expectedVersion: group.data.version },
			options,
		);
		expect(activeGroup.ok).toBe(true);
		if (!activeGroup.ok) return;
		const item = await createItem(
			{
				...ctx(),
				code: "UOM-ACT-ITEM",
				name: "UoM activation item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: activeGroup.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) return;

		const uoms = Reflect.get(store, "uoms") as Map<string, RefUom>;
		const baseUom = uoms.get(EA_UOM_ID);
		expect(baseUom).toBeDefined();
		if (baseUom === undefined) return;
		uoms.set(EA_UOM_ID, { ...baseUom, active: false });

		const activated = await activateItem(
			{ ...ctx(), id: item.data.id, expectedVersion: item.data.version },
			options,
		);
		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect((activated.details as { reason?: string }).reason).toBe(
				"MASTER_INVALID_STATE",
			);
		}
	});

	it("version CAS conflict", async () => {
		const { options } = createMasterDataTestHarness();

		const created = await createParty(
			{
				...ctx(),
				code: "ACME",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const conflict = await updateParty(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version + 1,
				name: "Acme Renamed",
			},
			options,
		);
		expect(conflict.ok).toBe(false);
		if (conflict.ok) {
			return;
		}
		expect(conflict.code).toBe("CONFLICT");
		expect((conflict.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_VERSION_CONFLICT",
		);
	});

	it("ordinary item updates cannot redefine base UoM or operational item type", async () => {
		const { options } = createMasterDataTestHarness();
		const group = await createItemGroup(
			{ ...ctx(), code: "GOV", name: "Governed items" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) return;
		const activeGroup = await activateItemGroup(
			{ ...ctx(), id: group.data.id, expectedVersion: group.data.version },
			options,
		);
		expect(activeGroup.ok).toBe(true);
		if (!activeGroup.ok) return;
		const item = await createItem(
			{
				...ctx(),
				code: "GOV-ITEM",
				name: "Governed item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: activeGroup.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) return;

		const baseChange = await updateItem(
			{
				...ctx(),
				id: item.data.id,
				expectedVersion: item.data.version,
				baseUomId: "b1000000-0000-4000-8000-000000000002",
			},
			options,
		);
		expect(baseChange.ok).toBe(false);
		if (!baseChange.ok) {
			expect((baseChange.details as { reason?: string }).reason).toBe(
				"MASTER_INVALID_STATE",
			);
		}

		const activated = await activateItem(
			{ ...ctx(), id: item.data.id, expectedVersion: item.data.version },
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) return;
		const typeChange = await updateItem(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
				itemType: "service",
			},
			options,
		);
		expect(typeChange.ok).toBe(false);
		if (!typeChange.ok) {
			expect((typeChange.details as { reason?: string }).reason).toBe(
				"MASTER_DEPENDENCY_BLOCKED",
			);
		}
	});

	it("cross-org get/update fail-closed", async () => {
		const { options } = createMasterDataTestHarness();

		const created = await createParty(
			{
				...ctx("org-a"),
				code: "ACME",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const got = await getPartyById(
			{
				organizationId: "org-b",
				actorUserId: "user-1",
				id: created.data.id,
			},
			options,
		);
		expect(got.ok).toBe(true);
		if (!got.ok) {
			return;
		}
		expect(got.data).toBeNull();

		const updated = await updateParty(
			{
				...ctx("org-b"),
				id: created.data.id,
				expectedVersion: created.data.version,
				name: "Hijack",
			},
			options,
		);
		expect(updated.ok).toBe(false);
		if (updated.ok) {
			return;
		}
		expect(updated.code).toBe("CONFLICT");
		expect((updated.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_CROSS_ORG_REFERENCE",
		);
	});

	it("pageSize 101 rejected by schema", () => {
		const parsed = masterListOptionsSchema.safeParse({
			organizationId: "org-a",
			actorUserId: "user-1",
			pageSize: 101,
		});
		expect(parsed.success).toBe(false);
	});

	it("rejects unsupported shared list fields", () => {
		const parsed = masterListOptionsSchema.safeParse({
			organizationId: "org-a",
			actorUserId: "user-1",
			partyKind: "organization",
		});
		expect(parsed.success).toBe(false);
	});

	it("party activate/retire lifecycle", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const created = await createParty(
			{
				...ctx(),
				code: "ACME",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const roleReady = await withActiveCustomerRole(created.data.id, options);
		expect(roleReady.ok).toBe(true);
		if (!roleReady.ok) {
			return;
		}

		const cr = await approvedActivatePartyChangeRequest(
			{ organizationId: ctx().organizationId, partyId: created.data.id },
			options,
		);
		const activated = await activateParty(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
				changeRequestId: cr.id,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");

		const retired = await retireParty(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) {
			return;
		}
		expect(retired.data.status).toBe("retired");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.party.activated.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.party.retired.v1",
			),
		).toBe(true);
	});

	it("party activation fails not-found before change-request governance", async () => {
		const { options } = createMasterDataTestHarness();
		const result = await activateParty(
			{
				...ctx(),
				id: randomUUID(),
				expectedVersion: 1,
				changeRequestId: randomUUID(),
			},
			options,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("NOT_FOUND");
			expect(result.details).toMatchObject({ reason: "MASTER_NOT_FOUND" });
		}
	});

	it("party store enforces the active-role invariant during transition", async () => {
		const { options, store, ports } = createMasterDataTestHarness();
		const created = await createParty(
			{
				...ctx(),
				code: "NO-ROLE",
				name: "No Role Party",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		const cr = await approvedActivatePartyChangeRequest(
			{ organizationId: created.data.organizationId, partyId: created.data.id },
			options,
		);

		const result = await store.transitionParty(
			{
				organizationId: created.data.organizationId,
				id: created.data.id,
				expectedVersion: created.data.version,
				actorUserId: ctx().actorUserId,
				toStatus: "active",
				changeRequestId: cr.id,
				requireActiveRole: true,
			},
			ports,
			{ correlationId: randomUUID(), eventSuffix: "activated" },
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(result.details).toMatchObject({ reason: "MASTER_INVALID_STATE" });
		}
	});

	it("code conflict", async () => {
		const { options } = createMasterDataTestHarness();

		const first = await createParty(
			{
				...ctx(),
				code: "acme",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(first.ok).toBe(true);

		const second = await createParty(
			{
				...ctx(),
				code: "ACME",
				name: "Acme Two",
				partyKind: "organization",
			},
			options,
		);
		expect(second.ok).toBe(false);
		if (second.ok) {
			return;
		}
		expect(second.code).toBe("CONFLICT");
		expect((second.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_CODE_CONFLICT",
		);
	});

	it("warehouse create + dependency-blocked retire", async () => {
		const { options } = createMasterDataTestHarness();
		const created = await createWarehouse(
			{
				...ctx(),
				code: "WH-1",
				name: "Main",
				locationType: "warehouse",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const inspector: DependencyInspector = {
			async listBlockers() {
				return [
					{
						module: "inventory",
						entityType: "stock_balance",
						entityId: "bal-1",
						reason: "open balance",
					},
				];
			},
		};
		const blocked = await retireWarehouse(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
			},
			{ ...options, dependencyInspector: inspector },
		);
		expect(blocked.ok).toBe(false);
		if (blocked.ok) {
			return;
		}
		expect(blocked.code).toBe("CONFLICT");
		expect((blocked.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_DEPENDENCY_BLOCKED",
		);
	});

	it("item group and warehouse activate/inactive lifecycle", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{ ...ctx(), code: "FG", name: "Finished goods" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}

		const activatedGroup = await activateItemGroup(
			{
				...ctx(),
				id: group.data.id,
				expectedVersion: group.data.version,
			},
			options,
		);
		expect(activatedGroup.ok).toBe(true);
		if (!activatedGroup.ok) {
			return;
		}
		expect(activatedGroup.data.status).toBe("active");

		const inactiveGroup = await inactiveItemGroup(
			{
				...ctx(),
				id: activatedGroup.data.id,
				expectedVersion: activatedGroup.data.version,
			},
			options,
		);
		expect(inactiveGroup.ok).toBe(true);
		if (!inactiveGroup.ok) {
			return;
		}
		expect(inactiveGroup.data.status).toBe("inactive");

		const warehouse = await createWarehouse(
			{
				...ctx(),
				code: "WH-MAIN",
				name: "Main",
				locationType: "warehouse",
			},
			options,
		);
		expect(warehouse.ok).toBe(true);
		if (!warehouse.ok) {
			return;
		}

		const activatedWh = await activateWarehouse(
			{
				...ctx(),
				id: warehouse.data.id,
				expectedVersion: warehouse.data.version,
			},
			options,
		);
		expect(activatedWh.ok).toBe(true);
		if (!activatedWh.ok) {
			return;
		}
		expect(activatedWh.data.status).toBe("active");

		const inactiveWh = await inactiveWarehouse(
			{
				...ctx(),
				id: activatedWh.data.id,
				expectedVersion: activatedWh.data.version,
			},
			options,
		);
		expect(inactiveWh.ok).toBe(true);
		if (!inactiveWh.ok) {
			return;
		}
		expect(inactiveWh.data.status).toBe("inactive");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.item_group.activated.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.warehouse.inactive.v1",
			),
		).toBe(true);
	});

	it("item-group hierarchy requires active parents and rejects cycles", async () => {
		const { options } = createMasterDataTestHarness();
		const parent = await createItemGroup(
			{ ...ctx(), code: "FOOD", name: "Food" },
			options,
		);
		expect(parent.ok).toBe(true);
		if (!parent.ok) return;

		const underDraft = await createItemGroup(
			{
				...ctx(),
				code: "FRESH-DRAFT",
				name: "Fresh draft",
				parentId: parent.data.id,
			},
			options,
		);
		expect(underDraft.ok).toBe(false);

		const activeParent = await activateItemGroup(
			{
				...ctx(),
				id: parent.data.id,
				expectedVersion: parent.data.version,
			},
			options,
		);
		expect(activeParent.ok).toBe(true);
		if (!activeParent.ok) return;

		const child = await createItemGroup(
			{
				...ctx(),
				code: "FRESH",
				name: "Fresh",
				parentId: activeParent.data.id,
			},
			options,
		);
		expect(child.ok).toBe(true);
		if (!child.ok) return;

		const activeChild = await activateItemGroup(
			{
				...ctx(),
				id: child.data.id,
				expectedVersion: child.data.version,
			},
			options,
		);
		expect(activeChild.ok).toBe(true);
		if (!activeChild.ok) return;

		const cycle = await updateItemGroup(
			{
				...ctx(),
				id: activeParent.data.id,
				expectedVersion: activeParent.data.version,
				parentId: activeChild.data.id,
			},
			options,
		);
		expect(cycle.ok).toBe(false);
		if (!cycle.ok) expect(cycle.code).toBe("BAD_REQUEST");

		const retired = await retireItemGroup(
			{
				...ctx(),
				id: activeParent.data.id,
				expectedVersion: activeParent.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(false);
		if (!retired.ok) {
			expect(retired.code).toBe("CONFLICT");
			expect((retired.details as { reason?: string }).reason).toBe(
				"MASTER_DEPENDENCY_BLOCKED",
			);
		}
	});

	it("item-group retirement is blocked by an assigned non-retired item", async () => {
		const { options } = createMasterDataTestHarness();
		const group = await createItemGroup(
			{ ...ctx(), code: "USED", name: "Used group" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) return;
		const activeGroup = await activateItemGroup(
			{
				...ctx(),
				id: group.data.id,
				expectedVersion: group.data.version,
			},
			options,
		);
		expect(activeGroup.ok).toBe(true);
		if (!activeGroup.ok) return;
		const item = await createItem(
			{
				...ctx(),
				code: "USED-ITEM",
				name: "Used item",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: activeGroup.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) return;

		const retired = await retireItemGroup(
			{
				...ctx(),
				id: activeGroup.data.id,
				expectedVersion: activeGroup.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(false);
		if (!retired.ok) {
			expect((retired.details as { reason?: string }).reason).toBe(
				"MASTER_DEPENDENCY_BLOCKED",
			);
		}
	});

	it("activateItem requires active item group", async () => {
		const { options, ports, store } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{ ...ctx(), code: "FG", name: "Finished goods" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}

		const createUnderDraft = await createItem(
			{
				...ctx(),
				code: "SKU-DRAFT",
				name: "Draft-group widget",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(createUnderDraft.ok).toBe(false);
		if (!createUnderDraft.ok) {
			expect(
				(createUnderDraft.details as { reason?: string } | undefined)?.reason,
			).toBe("MASTER_INVALID_STATE");
		}

		const activatedGroup = await activateItemGroup(
			{
				...ctx(),
				id: group.data.id,
				expectedVersion: group.data.version,
			},
			options,
		);
		expect(activatedGroup.ok).toBe(true);
		if (!activatedGroup.ok) return;
		const item = await createItem(
			{
				...ctx(),
				code: "SKU-1",
				name: "Widget",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: activatedGroup.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) return;

		const inactiveGroup = await inactiveItemGroup(
			{
				...ctx(),
				id: activatedGroup.data.id,
				expectedVersion: activatedGroup.data.version,
			},
			options,
		);
		expect(inactiveGroup.ok).toBe(true);
		if (!inactiveGroup.ok) return;
		const storeBlocked = await store.transitionItem(
			{
				organizationId: item.data.organizationId,
				id: item.data.id,
				expectedVersion: item.data.version,
				actorUserId: "user-1",
				toStatus: "active",
			},
			ports,
			{ correlationId: randomUUID(), eventSuffix: "activated" },
		);
		expect(storeBlocked.ok).toBe(false);
		if (!storeBlocked.ok) {
			expect((storeBlocked.details as { reason?: string }).reason).toBe(
				"MASTER_INVALID_STATE",
			);
		}
		const blocked = await activateItem(
			{ ...ctx(), id: item.data.id, expectedVersion: item.data.version },
			options,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok)
			expect((blocked.details as { reason?: string }).reason).toBe(
				"MASTER_INVALID_STATE",
			);

		const reactivatedGroup = await activateItemGroup(
			{
				...ctx(),
				id: inactiveGroup.data.id,
				expectedVersion: inactiveGroup.data.version,
			},
			options,
		);
		expect(reactivatedGroup.ok).toBe(true);
		if (!reactivatedGroup.ok) return;

		const activated = await activateItem(
			{
				...ctx(),
				id: item.data.id,
				expectedVersion: item.data.version,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");

		const inactivated = await inactiveItem(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(inactivated.ok).toBe(true);
		if (!inactivated.ok) {
			return;
		}
		expect(inactivated.data.status).toBe("inactive");
	});

	it("warehouse move rejects cycles", async () => {
		const { options } = createMasterDataTestHarness();

		const parent = await createWarehouse(
			{
				...ctx(),
				code: "WH-P",
				name: "Parent",
				locationType: "warehouse",
			},
			options,
		);
		expect(parent.ok).toBe(true);
		if (!parent.ok) {
			return;
		}
		const activeParent = await activateWarehouse(
			{ ...ctx(), id: parent.data.id, expectedVersion: parent.data.version },
			options,
		);
		expect(activeParent.ok).toBe(true);
		if (!activeParent.ok) return;

		const child = await createWarehouse(
			{
				...ctx(),
				code: "WH-C",
				name: "Child",
				locationType: "zone",
				parentId: activeParent.data.id,
			},
			options,
		);
		expect(child.ok).toBe(true);
		if (!child.ok) {
			return;
		}
		const activeChild = await activateWarehouse(
			{ ...ctx(), id: child.data.id, expectedVersion: child.data.version },
			options,
		);
		expect(activeChild.ok).toBe(true);
		if (!activeChild.ok) return;
		const activeMove = await moveWarehouse(
			{
				...ctx(),
				id: activeChild.data.id,
				expectedVersion: activeChild.data.version,
				parentId: null,
			},
			options,
		);
		expect(activeMove.ok).toBe(false);
		if (!activeMove.ok) {
			expect((activeMove.details as { reason?: string }).reason).toBe(
				"MASTER_INVALID_STATE",
			);
		}
		const typeChange = await updateWarehouse(
			{
				...ctx(),
				id: activeChild.data.id,
				expectedVersion: activeChild.data.version,
				locationType: "bin",
			},
			options,
		);
		expect(typeChange.ok).toBe(false);

		const inactiveParent = await inactiveWarehouse(
			{
				...ctx(),
				id: activeParent.data.id,
				expectedVersion: activeParent.data.version,
			},
			options,
		);
		expect(inactiveParent.ok).toBe(true);
		if (!inactiveParent.ok) return;

		const cycle = await moveWarehouse(
			{
				...ctx(),
				id: inactiveParent.data.id,
				expectedVersion: inactiveParent.data.version,
				parentId: activeChild.data.id,
			},
			options,
		);
		expect(cycle.ok).toBe(false);
		if (cycle.ok) {
			return;
		}
		expect(cycle.code).toBe("BAD_REQUEST");

		const retired = await retireWarehouse(
			{
				...ctx(),
				id: inactiveParent.data.id,
				expectedVersion: inactiveParent.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(false);
		if (!retired.ok) {
			expect((retired.details as { reason?: string }).reason).toBe(
				"MASTER_DEPENDENCY_BLOCKED",
			);
		}
	});

	it("activateWarehouse requires an active parent when nested", async () => {
		const { options } = createMasterDataTestHarness();
		const parent = await createWarehouse(
			{
				...ctx(),
				code: "WH-STALE-P",
				name: "Stale parent",
				locationType: "warehouse",
			},
			options,
		);
		expect(parent.ok).toBe(true);
		if (!parent.ok) return;
		const activeParent = await activateWarehouse(
			{ ...ctx(), id: parent.data.id, expectedVersion: parent.data.version },
			options,
		);
		expect(activeParent.ok).toBe(true);
		if (!activeParent.ok) return;
		const child = await createWarehouse(
			{
				...ctx(),
				code: "WH-STALE-C",
				name: "Stale child",
				locationType: "zone",
				parentId: activeParent.data.id,
			},
			options,
		);
		expect(child.ok).toBe(true);
		if (!child.ok) return;
		const inactiveParent = await inactiveWarehouse(
			{
				...ctx(),
				id: activeParent.data.id,
				expectedVersion: activeParent.data.version,
			},
			options,
		);
		expect(inactiveParent.ok).toBe(true);
		if (!inactiveParent.ok) return;

		const activated = await activateWarehouse(
			{ ...ctx(), id: child.data.id, expectedVersion: child.data.version },
			options,
		);
		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect((activated.details as { reason?: string }).reason).toBe(
				"MASTER_INVALID_STATE",
			);
		}
	});

	it("party restore emits restored not created", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const created = await createParty(
			{
				...ctx(),
				code: "ACME",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const roleReady = await withActiveCustomerRole(created.data.id, options);
		expect(roleReady.ok).toBe(true);
		if (!roleReady.ok) {
			return;
		}

		const cr = await approvedActivatePartyChangeRequest(
			{ organizationId: ctx().organizationId, partyId: created.data.id },
			options,
		);
		const activated = await activateParty(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
				changeRequestId: cr.id,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const retired = await retireParty(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) {
			return;
		}

		ports.outbox.calls.length = 0;
		const restored = await restoreParty(
			{
				...ctx(),
				id: retired.data.id,
				expectedVersion: retired.data.version,
			},
			options,
		);
		expect(restored.ok).toBe(true);
		if (!restored.ok) {
			return;
		}
		expect(restored.data.status).toBe("draft");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.party.restored.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.party.created.v1",
			),
		).toBe(false);
	});

	it("party inactive lifecycle", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const created = await createParty(
			{
				...ctx(),
				code: "ACME",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const roleReady = await withActiveCustomerRole(created.data.id, options);
		expect(roleReady.ok).toBe(true);
		if (!roleReady.ok) {
			return;
		}

		const cr = await approvedActivatePartyChangeRequest(
			{ organizationId: ctx().organizationId, partyId: created.data.id },
			options,
		);
		const activated = await activateParty(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
				changeRequestId: cr.id,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const inactivated = await inactiveParty(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(inactivated.ok).toBe(true);
		if (!inactivated.ok) {
			return;
		}
		expect(inactivated.data.status).toBe("inactive");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.party.inactive.v1",
			),
		).toBe(true);
	});

	it("payment term create + getByCode + CAS + lifecycle outbox", async () => {
		const { options, ports, store } = createMasterDataTestHarness();

		for (const netDays of [-1, 1.5, 1000]) {
			const invalid = await createPaymentTerm(
				{
					...ctx(),
					code: `INVALID-${netDays}`,
					name: "Invalid payment term",
					netDays,
				},
				options,
			);
			expect(invalid.ok).toBe(false);
		}

		const immediate = await createPaymentTerm(
			{
				...ctx(),
				code: "DUE0",
				name: "Due immediately",
				netDays: 0,
			},
			options,
		);
		expect(immediate.ok).toBe(true);

		const created = await createPaymentTerm(
			{
				...ctx(),
				code: "NET30",
				name: "Net 30",
				netDays: 30,
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.netDays).toBe(30);
		expect(created.data.status).toBe("draft");

		const byCode = await getPaymentTermByCode(
			{ organizationId: "org-a", actorUserId: "user-1", code: "net30" },
			options,
		);
		expect(byCode.ok).toBe(true);
		if (!byCode.ok || byCode.data === null) {
			return;
		}
		expect(byCode.data.id).toBe(created.data.id);

		const listed = await listPaymentTerms(
			{ organizationId: "org-a", actorUserId: "user-1", pageSize: 50 },
			options,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data).toHaveLength(2);

		const casFail = await updatePaymentTerm(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version + 1,
				name: "Net 30 renamed",
			},
			options,
		);
		expect(casFail.ok).toBe(false);
		if (casFail.ok) {
			return;
		}
		expect(casFail.code).toBe("CONFLICT");
		expect((casFail.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_VERSION_CONFLICT",
		);

		const activated = await activatePaymentTerm(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");

		const inactive = await inactivePaymentTerm(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(inactive.ok).toBe(true);
		if (!inactive.ok) {
			return;
		}
		expect(inactive.data.status).toBe("inactive");

		const invalidStoreTransition = await store.transitionPaymentTerm(
			{
				organizationId: inactive.data.organizationId,
				id: inactive.data.id,
				expectedVersion: inactive.data.version,
				actorUserId: "user-1",
				toStatus: "inactive",
			},
			ports,
			{ correlationId: randomUUID(), eventSuffix: "inactive" },
		);
		expect(invalidStoreTransition.ok).toBe(false);

		const retired = await retirePaymentTerm(
			{
				...ctx(),
				id: inactive.data.id,
				expectedVersion: inactive.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) return;

		const updateRetired = await updatePaymentTerm(
			{
				...ctx(),
				id: retired.data.id,
				expectedVersion: retired.data.version,
				netDays: 45,
			},
			options,
		);
		expect(updateRetired.ok).toBe(false);
		if (!updateRetired.ok) {
			expect(
				(updateRetired.details as { reason?: string } | undefined)?.reason,
			).toBe("MASTER_INVALID_STATE");
		}

		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.payment_term.created.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.payment_term.inactive.v1",
			),
		).toBe(true);
	});

	it("tax registration tenancy · uniqueness · overlap · CAS · lifecycle", async () => {
		const { options, ports, store } = createMasterDataTestHarness();
		const countryId = "c1000000-0000-4000-8000-000000000001";

		const normalized = normalizeTaxRegistrationNumber("vat-123 / ab");
		expect(normalized.ok).toBe(true);
		if (!normalized.ok) {
			return;
		}
		expect(normalized.data.normalizedRegistrationNumber).toBe("VAT123AB");

		expect(
			validityRangesOverlap(
				{
					validFrom: new Date("2026-01-01T00:00:00.000Z"),
					validTo: new Date("2026-06-01T00:00:00.000Z"),
				},
				{
					validFrom: new Date("2026-05-01T00:00:00.000Z"),
					validTo: null,
				},
			),
		).toBe(true);

		const party = await createParty(
			{
				...ctx(),
				code: "TAX-P1",
				name: "Tax Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) {
			return;
		}

		const invalidCountry = await createTaxRegistration(
			{
				...ctx(),
				partyId: party.data.id,
				jurisdictionCountryId: "c1000000-0000-4000-8000-999999999999",
				registrationType: "vat_gst",
				registrationNumber: "COUNTRY-FAIL",
			},
			options,
		);
		expect(invalidCountry.ok).toBe(false);

		const created = await createTaxRegistration(
			{
				...ctx(),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "vat_gst",
				registrationNumber: "VAT-123 / ab",
				name: "MY GST",
				validFrom: new Date("2026-01-01T00:00:00.000Z"),
				validTo: new Date("2026-06-01T00:00:00.000Z"),
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.normalizedRegistrationNumber).toBe("VAT123AB");
		expect(created.data.status).toBe("draft");

		const otherOrg = await createTaxRegistration(
			{
				...ctx("org-b"),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "vat_gst",
				registrationNumber: "VAT-123 / ab",
			},
			options,
		);
		expect(otherOrg.ok).toBe(false);

		const dup = await createTaxRegistration(
			{
				...ctx(),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "vat_gst",
				registrationNumber: "vat123ab",
			},
			options,
		);
		expect(dup.ok).toBe(false);
		if (dup.ok) {
			return;
		}
		expect((dup.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_CODE_CONFLICT",
		);

		const casFail = await updateTaxRegistration(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version + 1,
				name: "renamed",
			},
			options,
		);
		expect(casFail.ok).toBe(false);
		if (casFail.ok) {
			return;
		}
		expect((casFail.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_VERSION_CONFLICT",
		);

		const noFrom = await createTaxRegistration(
			{
				...ctx(),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "tin",
				registrationNumber: "TIN-1",
			},
			options,
		);
		expect(noFrom.ok).toBe(true);
		if (!noFrom.ok) {
			return;
		}
		const activateNoFrom = await activateTaxRegistration(
			{
				...ctx(),
				id: noFrom.data.id,
				expectedVersion: noFrom.data.version,
			},
			options,
		);
		expect(activateNoFrom.ok).toBe(false);
		if (activateNoFrom.ok) {
			return;
		}
		expect(
			(activateNoFrom.details as { reason?: string } | undefined)?.reason,
		).toBe("MASTER_INVALID_STATE");

		const activated = await activateTaxRegistration(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");

		const overlapSibling = await createTaxRegistration(
			{
				...ctx(),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "vat_gst",
				registrationNumber: "VAT-999",
				validFrom: new Date("2026-03-01T00:00:00.000Z"),
			},
			options,
		);
		expect(overlapSibling.ok).toBe(true);
		if (!overlapSibling.ok) {
			return;
		}
		const overlapActivate = await activateTaxRegistration(
			{
				...ctx(),
				id: overlapSibling.data.id,
				expectedVersion: overlapSibling.data.version,
			},
			options,
		);
		expect(overlapActivate.ok).toBe(false);
		if (overlapActivate.ok) {
			return;
		}
		expect(
			(overlapActivate.details as { reason?: string } | undefined)?.reason,
		).toBe("MASTER_VALIDITY_OVERLAP");
		const storeOverlapActivate = await store.transitionTaxRegistration(
			{
				organizationId: overlapSibling.data.organizationId,
				id: overlapSibling.data.id,
				expectedVersion: overlapSibling.data.version,
				actorUserId: "user-1",
				toStatus: "active",
			},
			ports,
			{ correlationId: randomUUID(), eventSuffix: "activated" },
		);
		expect(storeOverlapActivate.ok).toBe(false);
		if (!storeOverlapActivate.ok) {
			expect(
				(storeOverlapActivate.details as { reason?: string } | undefined)
					?.reason,
			).toBe("MASTER_VALIDITY_OVERLAP");
		}

		const adjacent = await createTaxRegistration(
			{
				...ctx(),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "vat_gst",
				registrationNumber: "VAT-ADJACENT",
				validFrom: new Date("2026-06-01T00:00:00.000Z"),
				validTo: new Date("2026-12-31T00:00:00.000Z"),
			},
			options,
		);
		expect(adjacent.ok).toBe(true);
		if (!adjacent.ok) return;
		const adjacentActivated = await activateTaxRegistration(
			{
				...ctx(),
				id: adjacent.data.id,
				expectedVersion: adjacent.data.version,
			},
			options,
		);
		expect(adjacentActivated.ok).toBe(true);

		const listed = await listTaxRegistrations(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				partyId: party.data.id,
				pageSize: 50,
			},
			options,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.length).toBeGreaterThanOrEqual(2);

		const pageCap = masterListOptionsSchema.safeParse({
			organizationId: "org-a",
			actorUserId: "user-1",
			pageSize: 101,
		});
		expect(pageCap.success).toBe(false);

		const byParty = await findTaxRegistrationsByParty(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				partyId: party.data.id,
			},
			options,
		);
		expect(byParty.ok).toBe(true);

		const blocked = await blockTaxRegistration(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(blocked.ok).toBe(true);
		if (!blocked.ok) {
			return;
		}
		expect(blocked.data.status).toBe("blocked");

		const retired = await retireTaxRegistration(
			{
				...ctx(),
				id: blocked.data.id,
				expectedVersion: blocked.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) {
			return;
		}
		expect(retired.data.status).toBe("retired");

		const directRestoreToActive = await store.transitionTaxRegistration(
			{
				organizationId: retired.data.organizationId,
				id: retired.data.id,
				expectedVersion: retired.data.version,
				actorUserId: "user-1",
				toStatus: "active",
			},
			ports,
			{ correlationId: randomUUID(), eventSuffix: "activated" },
		);
		expect(directRestoreToActive.ok).toBe(false);

		const updateRetired = await updateTaxRegistration(
			{
				...ctx(),
				id: retired.data.id,
				expectedVersion: retired.data.version,
				name: "must not change",
			},
			options,
		);
		expect(updateRetired.ok).toBe(false);
		if (!updateRetired.ok) {
			expect(
				(updateRetired.details as { reason?: string } | undefined)?.reason,
			).toBe("MASTER_INVALID_STATE");
		}

		const restored = await restoreTaxRegistration(
			{
				...ctx(),
				id: retired.data.id,
				expectedVersion: retired.data.version,
			},
			options,
		);
		expect(restored.ok).toBe(true);
		if (!restored.ok) {
			return;
		}
		expect(restored.data.status).toBe("blocked");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.tax_registration.created.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.tax_registration.activated.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.tax_registration.blocked.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.tax_registration.restored.v1",
			),
		).toBe(true);
		const taxSecurityEvidence = JSON.stringify({
			audit: ports.audit.calls.filter(
				(call) => call.entity === "tax_registration",
			),
			outbox: ports.outbox.calls.filter((call) =>
				call.type.startsWith("master_data.tax_registration."),
			),
		});
		expect(taxSecurityEvidence).not.toContain("VAT-123 / ab");
		expect(taxSecurityEvidence).not.toContain("VAT123AB");
	});
});
