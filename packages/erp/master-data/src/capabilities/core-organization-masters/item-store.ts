import type { MasterDataStore } from "./store";

/** Persistence boundary required by the item-group aggregate. */
export type ItemGroupStore = Pick<
	MasterDataStore,
	| "getItemGroupById"
	| "getItemGroupByCode"
	| "listItemGroups"
	| "createItemGroup"
	| "updateItemGroup"
	| "transitionItemGroup"
>;

/** Persistence boundary required by the item aggregate. */
export type ItemStore = Pick<
	MasterDataStore,
	| "getItemById"
	| "getItemByCode"
	| "listItems"
	| "createItem"
	| "updateItem"
	| "transitionItem"
>;
