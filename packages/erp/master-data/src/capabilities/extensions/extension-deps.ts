import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "../../command-options";
import type {
	ItemExtensionRootReader,
	PartyExtensionRootReader,
	WarehouseExtensionRootReader,
} from "./extension-policies";
import type {
	ItemExtensionStore,
	PartyExtensionStore,
	WarehouseExtensionStore,
} from "./store";
import type { ItemVariantExtensionStore } from "./template-store";

type StoreKeys<Store extends object> = readonly (keyof Store)[];

type SelectedStore<Store extends object, Keys extends StoreKeys<Store>> = Pick<
	Store,
	Keys[number]
>;

function assertStoreCapabilities<
	Store extends object,
	const Keys extends StoreKeys<Store>,
>(
	store: Store,
	capabilities: Keys,
): asserts store is Store & SelectedStore<Store, Keys> {
	for (const capability of capabilities) {
		if (typeof store[capability] !== "function") {
			throw new Error(
				`Master-data store capability "${String(capability)}" is unavailable`,
			);
		}
	}
}

/**
 * Resolves dependencies for a party-extension command.
 *
 * The capability tuple narrows the store available to the command. Production
 * stores are expected to implement the complete PartyExtensionStore contract.
 */
export function resolvePartyExtensionDeps<
	const Keys extends StoreKeys<PartyExtensionStore>,
>(options: MasterCommandOptions, capabilities: Keys) {
	const deps = resolveCommandDeps(options);
	assertStoreCapabilities(deps.store, capabilities);
	const store: SelectedStore<PartyExtensionStore, Keys> = deps.store;
	const roots: PartyExtensionRootReader = deps.store;
	return { ...deps, roots, store };
}

/**
 * Resolves dependencies for an item-extension command.
 *
 * The capability tuple narrows the store available to the command. Production
 * stores are expected to implement the complete ItemExtensionStore contract.
 */
export function resolveItemExtensionDeps<
	const Keys extends StoreKeys<ItemExtensionStore>,
>(options: MasterCommandOptions, capabilities: Keys) {
	const deps = resolveCommandDeps(options);
	assertStoreCapabilities(deps.store, capabilities);
	const store: SelectedStore<ItemExtensionStore, Keys> = deps.store;
	const roots: ItemExtensionRootReader = deps.store;
	return { ...deps, roots, store };
}

/**
 * Resolves dependencies for a warehouse-extension command.
 *
 * The capability tuple narrows the store available to the command. Production
 * stores are expected to implement the complete WarehouseExtensionStore contract.
 */
export function resolveWarehouseExtensionDeps<
	const Keys extends StoreKeys<WarehouseExtensionStore>,
>(options: MasterCommandOptions, capabilities: Keys) {
	const deps = resolveCommandDeps(options);
	assertStoreCapabilities(deps.store, capabilities);
	const store: SelectedStore<WarehouseExtensionStore, Keys> = deps.store;
	const roots: WarehouseExtensionRootReader = deps.store;
	return { ...deps, roots, store };
}

/**
 * Resolves dependencies for an item-variant extension command.
 *
 * The capability tuple narrows the store available to the command. Production
 * stores are expected to implement the complete ItemVariantExtensionStore contract.
 */
export function resolveItemVariantExtensionDeps<
	const Keys extends StoreKeys<ItemVariantExtensionStore>,
>(options: MasterCommandOptions, capabilities: Keys) {
	const deps = resolveCommandDeps(options);
	assertStoreCapabilities(deps.store, capabilities);
	const store: SelectedStore<ItemVariantExtensionStore, Keys> = deps.store;
	return { ...deps, store };
}
