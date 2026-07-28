import { createWarehouse, getWarehouseById, updateWarehouse } from "../../src";
import type { Warehouse } from "../../src/types";
import {
	createDrizzleHarness,
	createMemoryHarness,
	defineRootParityTests,
	type RootParityContract,
} from "./parity-harness";

const contract: RootParityContract<Warehouse> = {
	create: (harness) =>
		createWarehouse(
			{
				...harness.context(),
				code: "PARITY-WH",
				name: "Parity Warehouse",
				locationType: "warehouse",
			},
			harness.options,
		),
	get: (harness, id, organizationId) =>
		getWarehouseById(
			{ ...harness.queryContext(organizationId), id },
			harness.options,
		),
	update: (harness, row, expectedVersion) =>
		updateWarehouse(
			{
				...harness.context(),
				id: row.id,
				expectedVersion,
				name: "Parity Warehouse Updated",
			},
			harness.options,
		),
};

defineRootParityTests(
	"MemoryMasterDataStore warehouse",
	createMemoryHarness,
	contract,
);
defineRootParityTests(
	"DrizzleMasterDataStore warehouse",
	createDrizzleHarness,
	contract,
);
