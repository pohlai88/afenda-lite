import { describe, expect, it } from "vitest";

describe("extension query public surface", () => {
	it("exports only governed extension queries", async () => {
		const queries = await import(
			"../src/capabilities/extensions/extension-queries"
		);
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
				"getPartyRole",
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
				"listTemplateAttributeOptions",
				"listTemplateAttributes",
				"listVariantAttributeValues",
			].sort(),
		);
	});
});
