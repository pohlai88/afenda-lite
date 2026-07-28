import { createItemGroup, getItemGroupById, updateItemGroup } from "../../src";
import type { ItemGroup } from "../../src/types";
import {
	createDrizzleHarness,
	createMemoryHarness,
	defineRootParityTests,
	type RootParityContract,
} from "./parity-harness";

const contract: RootParityContract<ItemGroup> = {
	create: (harness) =>
		createItemGroup(
			{ ...harness.context(), code: "PARITY-GROUP", name: "Parity Group" },
			harness.options,
		),
	get: (harness, id, organizationId) =>
		getItemGroupById(
			{ ...harness.queryContext(organizationId), id },
			harness.options,
		),
	update: (harness, row, expectedVersion) =>
		updateItemGroup(
			{
				...harness.context(),
				id: row.id,
				expectedVersion,
				name: "Parity Group Updated",
			},
			harness.options,
		),
};

defineRootParityTests(
	"MemoryMasterDataStore item group",
	createMemoryHarness,
	contract,
);
defineRootParityTests(
	"DrizzleMasterDataStore item group",
	createDrizzleHarness,
	contract,
);
