import type { MasterDataStore } from "./store";

/** Persistence boundary required by the warehouse aggregate. */
export type WarehouseStore = Pick<
	MasterDataStore,
	| "getWarehouseById"
	| "getWarehouseByCode"
	| "listWarehouses"
	| "createWarehouse"
	| "updateWarehouse"
	| "moveWarehouse"
	| "transitionWarehouse"
>;
