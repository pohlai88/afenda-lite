import { describe, expect, it } from "vitest";

import { createEmptyDependencyInspector } from "../src/capabilities/core-organization-masters/dependency";
import type { MasterDataStore } from "../src/capabilities/core-organization-masters/store";
import {
	resolveItemExtensionDeps,
	resolveItemVariantExtensionDeps,
	resolvePartyExtensionDeps,
	resolveWarehouseExtensionDeps,
} from "../src/capabilities/extensions/extension-deps";
import { createMasterDataTestHarness } from "./helpers/harness";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

describe("extension dependency resolvers", () => {
	it("narrows declared store capabilities and keeps root readers where required", () => {
		const { options } = createMasterDataTestHarness();

		const partyDeps = resolvePartyExtensionDeps(options, [
			"createPartyContact",
			"listPartyContacts",
		] as const);
		expect(typeof partyDeps.store.createPartyContact).toBe("function");
		expect(typeof partyDeps.store.listPartyContacts).toBe("function");
		expect(typeof partyDeps.roots.getPartyById).toBe("function");

		const itemDeps = resolveItemExtensionDeps(options, [
			"createItemAlias",
			"findItemByAlias",
		] as const);
		expect(typeof itemDeps.store.createItemAlias).toBe("function");
		expect(typeof itemDeps.store.findItemByAlias).toBe("function");
		expect(typeof itemDeps.roots.getItemById).toBe("function");

		const warehouseDeps = resolveWarehouseExtensionDeps(options, [
			"createWarehouseExternalId",
		] as const);
		expect(typeof warehouseDeps.store.createWarehouseExternalId).toBe(
			"function",
		);
		expect(typeof warehouseDeps.roots.getWarehouseById).toBe("function");

		const variantDeps = resolveItemVariantExtensionDeps(options, [
			"createItemVariant",
		] as const);
		expect(typeof variantDeps.store.createItemVariant).toBe("function");
	});

	it("fails fast when an unsafe store override is missing a declared capability", () => {
		const options = {
			store: {} as MasterDataStore,
			ports: createMemoryMutationPorts(),
			dependencyInspector: createEmptyDependencyInspector(),
		};

		expect(() =>
			resolvePartyExtensionDeps(options, ["createPartyContact"] as const),
		).toThrow(
			'Master-data store capability "createPartyContact" is unavailable',
		);
	});
});
