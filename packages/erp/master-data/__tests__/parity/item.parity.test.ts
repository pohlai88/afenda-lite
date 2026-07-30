import {
	activateItemGroup,
	createItem,
	createItemGroup,
	getItemById,
	updateItem,
} from "../../src";
import type { Item } from "../../src/types";
import {
	createDrizzleHarness,
	createMemoryHarness,
	defineRootParityTests,
	type RootParityContract,
} from "./parity-harness";

const contract: RootParityContract<Item> = {
	create: async (harness) => {
		const group = await createItemGroup(
			{
				...harness.context(),
				code: "PARITY-ITEM-GROUP",
				name: "Parity Item Group",
			},
			harness.options,
		);
		if (!group.ok) {
			return group;
		}
		const active = await activateItemGroup(
			{
				...harness.context(),
				id: group.data.id,
				expectedVersion: group.data.version,
			},
			harness.options,
		);
		if (!active.ok) {
			return active;
		}
		return createItem(
			{
				...harness.context(),
				code: "PARITY-ITEM",
				name: "Parity Item",
				itemType: "stock",
				baseUomId: harness.uomId,
				itemGroupId: active.data.id,
			},
			harness.options,
		);
	},
	get: (harness, id, organizationId) =>
		getItemById(
			{ ...harness.queryContext(organizationId), id },
			harness.options,
		),
	update: (harness, row, expectedVersion) =>
		updateItem(
			{
				...harness.context(),
				id: row.id,
				expectedVersion,
				name: "Parity Item Updated",
			},
			harness.options,
		),
};

defineRootParityTests(
	"MemoryMasterDataStore item",
	createMemoryHarness,
	contract,
);
defineRootParityTests(
	"DrizzleMasterDataStore item",
	createDrizzleHarness,
	contract,
);
