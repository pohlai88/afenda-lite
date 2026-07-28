import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
	activatePartyRole,
	addItemTemplateAttribute,
	addItemTemplateAttributeOption,
	archivePartyRole,
	createItemAlias,
	createItemBarcode,
	createItemExternalId,
	createItemUom,
	createPartyAddress,
	createPartyContact,
	createPartyExternalId,
	createPartyRelationship,
	createPartyRole,
	createWarehouseExternalId,
	deactivatePartyRole,
	findItemByAlias,
	findItemByBarcode,
	findItemByExternalId,
	findPartyByExternalId,
	findWarehouseByExternalId,
	getDefaultItemPurchaseUom,
	getDefaultItemSalesUom,
	getPartyAddressById,
	getPartyRole,
	getPartyRoleById,
	getPrimaryPartyAddress,
	getPrimaryPartyContact,
	getSensitivePrimaryPartyContact,
	getVariantConfiguration,
	listActivePartyRoles,
	listItemAliases,
	listItemsByAlias,
	listItemTemplateAttributeOptions,
	listItemTemplateAttributes,
	listItemUoms,
	listPartyAddresses,
	listPartyContacts,
	listPartyRelationships,
	listPartyRoles,
	listSensitivePartyContacts,
	listTemplateAttributeOptions,
	listTemplateAttributes,
	listVariantAttributeValues,
	retirePartyRole,
	updatePartyAddress,
	updatePartyContact,
	updatePartyContactVerification,
	updatePartyRole,
} from "../src/index";

const packageRoot = join(import.meta.dirname, "..");

const PUBLIC_EXTENSION_OPERATIONS = [
	["activatePartyRole", activatePartyRole],
	["addItemTemplateAttribute", addItemTemplateAttribute],
	["addItemTemplateAttributeOption", addItemTemplateAttributeOption],
	["archivePartyRole", archivePartyRole],
	["createItemAlias", createItemAlias],
	["createItemBarcode", createItemBarcode],
	["createItemExternalId", createItemExternalId],
	["createItemUom", createItemUom],
	["createPartyAddress", createPartyAddress],
	["createPartyContact", createPartyContact],
	["createPartyExternalId", createPartyExternalId],
	["createPartyRelationship", createPartyRelationship],
	["createPartyRole", createPartyRole],
	["createWarehouseExternalId", createWarehouseExternalId],
	["deactivatePartyRole", deactivatePartyRole],
	["findItemByAlias", findItemByAlias],
	["findItemByBarcode", findItemByBarcode],
	["findItemByExternalId", findItemByExternalId],
	["findPartyByExternalId", findPartyByExternalId],
	["findWarehouseByExternalId", findWarehouseByExternalId],
	["getDefaultItemPurchaseUom", getDefaultItemPurchaseUom],
	["getDefaultItemSalesUom", getDefaultItemSalesUom],
	["getPartyAddressById", getPartyAddressById],
	["getPartyRole", getPartyRole],
	["getPartyRoleById", getPartyRoleById],
	["getPrimaryPartyAddress", getPrimaryPartyAddress],
	["getPrimaryPartyContact", getPrimaryPartyContact],
	["getSensitivePrimaryPartyContact", getSensitivePrimaryPartyContact],
	["getVariantConfiguration", getVariantConfiguration],
	["listActivePartyRoles", listActivePartyRoles],
	["listItemAliases", listItemAliases],
	["listItemsByAlias", listItemsByAlias],
	["listItemTemplateAttributeOptions", listItemTemplateAttributeOptions],
	["listItemTemplateAttributes", listItemTemplateAttributes],
	["listItemUoms", listItemUoms],
	["listPartyAddresses", listPartyAddresses],
	["listPartyContacts", listPartyContacts],
	["listSensitivePartyContacts", listSensitivePartyContacts],
	["listPartyRelationships", listPartyRelationships],
	["listPartyRoles", listPartyRoles],
	["listTemplateAttributeOptions", listTemplateAttributeOptions],
	["listTemplateAttributes", listTemplateAttributes],
	["listVariantAttributeValues", listVariantAttributeValues],
	["retirePartyRole", retirePartyRole],
	["updatePartyAddress", updatePartyAddress],
	["updatePartyContact", updatePartyContact],
	["updatePartyContactVerification", updatePartyContactVerification],
	["updatePartyRole", updatePartyRole],
] as const;

const EXTENSION_SOURCE_FILES = [
	"party-roles.ts",
	"party-addresses.ts",
	"party-contacts.ts",
	"party-external-ids.ts",
	"party-relationships.ts",
	"item-uoms.ts",
	"item-barcodes.ts",
	"item-external-ids.ts",
	"item-aliases.ts",
	"warehouse-external-ids.ts",
	"template-attributes.ts",
	"template-options.ts",
	"variant-attribute-values.ts",
] as const;

describe("extension public contract", () => {
	it("keeps governed extension operations available from the package root", () => {
		for (const [operationName, operation] of PUBLIC_EXTENSION_OPERATIONS) {
			expect(operation, operationName).toBeTypeOf("function");
		}
	});

	it("keeps extension implementation owned by the capability folder", () => {
		const readme = readFileSync(
			join(packageRoot, "src", "capabilities", "extensions", "README.md"),
			"utf8",
		);

		for (const sourceFile of EXTENSION_SOURCE_FILES) {
			expect(readme).toContain(sourceFile);
		}
	});

	it("does not publish a separate extensions package subpath", () => {
		const packageJson = JSON.parse(
			readFileSync(join(packageRoot, "package.json"), "utf8"),
		) as { exports?: Record<string, unknown> };

		expect(packageJson.exports).not.toHaveProperty("./extensions");
		expect(packageJson.exports).not.toHaveProperty("./types");
	});
});
