import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const drizzleStorePath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../src/drizzle-store.ts",
);

describe("@afenda/master-data same-TX inventory", () => {
	it("embeds runNeonHttpTransaction for every org mutation surface", () => {
		const source = readFileSync(drizzleStorePath, "utf8");
		expect(source).not.toContain("afterWritePorts");
		const mutationMethods = [
			"async createParty(",
			"async updateParty(",
			"async transitionParty(",
			"async createItemGroup(",
			"async updateItemGroup(",
			"async transitionItemGroup(",
			"async createItem(",
			"async updateItem(",
			"transitionItem = drizzleTransitionItemWithVariantSideEffect",
			"async createWarehouse(",
			"async updateWarehouse(",
			"async moveWarehouse(",
			"async transitionWarehouse(",
			"async createPaymentTerm(",
			"async updatePaymentTerm(",
			"async transitionPaymentTerm(",
			"async createTaxRegistration(",
			"async updateTaxRegistration(",
			"async transitionTaxRegistration(",
			"createChangeRequest = drizzleCreateChangeRequest",
			"transitionChangeRequest = drizzleTransitionChangeRequest",
			"createPartyRole = drizzleCreatePartyRole",
			"transitionPartyRole = drizzleTransitionPartyRole",
			"createPartyAddress = drizzleCreatePartyAddress",
			"updatePartyAddress = drizzleUpdatePartyAddress",
			"createPartyContact = drizzleCreatePartyContact",
			"updatePartyContact = drizzleUpdatePartyContact",
			"createPartyExternalId = drizzleCreatePartyExternalId",
			"createPartyRelationship = drizzleCreatePartyRelationship",
			"createItemUom = drizzleCreateItemUom",
			"createItemBarcode = drizzleCreateItemBarcode",
			"createItemExternalId = drizzleCreateItemExternalId",
			"createItemAlias = drizzleCreateItemAlias",
			"createWarehouseExternalId = drizzleCreateWarehouseExternalId",
			"createItemTemplate = drizzleCreateItemTemplate",
			"updateItemTemplate = drizzleUpdateItemTemplate",
			"transitionItemTemplate = drizzleTransitionItemTemplate",
			"addItemTemplateAttribute = drizzleAddItemTemplateAttribute",
			"addItemTemplateAttributeOption = drizzleAddItemTemplateAttributeOption",
			"createItemVariant = drizzleCreateItemVariant",
		];
		for (const method of mutationMethods) {
			expect(source).toContain(method);
		}
		const extensionSource = readFileSync(
			join(
				dirname(fileURLToPath(import.meta.url)),
				"../src/drizzle-extension-mutations.ts",
			),
			"utf8",
		);
		const changeRequestSource = readFileSync(
			join(
				dirname(fileURLToPath(import.meta.url)),
				"../src/drizzle-change-request.ts",
			),
			"utf8",
		);
		const variantSource = readFileSync(
			join(
				dirname(fileURLToPath(import.meta.url)),
				"../src/drizzle-variant-mutations.ts",
			),
			"utf8",
		);
		const combined = `${source}\n${extensionSource}\n${changeRequestSource}\n${variantSource}`;
		const txCalls = combined.match(/runNeonHttpTransaction/g) ?? [];
		expect(txCalls.length).toBeGreaterThanOrEqual(mutationMethods.length);
	});
});
