import { describe, expect, it } from "vitest";

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
