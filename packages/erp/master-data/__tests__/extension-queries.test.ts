import { describe, expect, it } from "vitest";
// biome-ignore lint/performance/noNamespaceImport: This contract test intentionally enumerates the complete module surface.
import * as queries from "../src/capabilities/extensions/extension-queries";

describe("extension query public surface", () => {
	it("exports only governed extension queries", () => {
		expect(Object.keys(queries).sort()).toEqual(
			[
				"findItemByAlias",
				"findItemByBarcode",
				"findItemByExternalId",
				"findPartyByExternalId",
				"findWarehouseByExternalId",
				"getDefaultItemPurchaseUom",
				"getDefaultItemSalesUom",
				"getPartyAddressById",
				"getPartyRoleById",
				"getPrimaryPartyAddress",
				"getPrimaryPartyContact",
				"getVariantConfiguration",
				"listActivePartyRoles",
				"listItemAliases",
				"listItemsByAlias",
				"listItemTemplateAttributeOptions",
				"listItemTemplateAttributes",
				"listItemUoms",
				"listPartyAddresses",
				"listPartyContacts",
				"listPartyRelationships",
				"listPartyRoles",
				"listVariantAttributeValues",
			].sort(),
		);
	});
});
