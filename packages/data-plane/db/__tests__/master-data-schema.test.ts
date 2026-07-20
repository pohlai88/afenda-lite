import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { HARD_TENANT_ROOT_TABLE_NAMES } from "../src/hard-tenant-roots";
import {
	mdChangeRequest,
	mdImportBatch,
	mdItem,
	mdItemAlias,
	mdItemBarcode,
	mdItemExternalId,
	mdItemGroup,
	mdItemTemplate,
	mdItemTemplateAttribute,
	mdItemTemplateAttributeOption,
	mdItemUom,
	mdItemVariant,
	mdItemVariantAttributeValue,
	mdParty,
	mdPartyAddress,
	mdPartyContact,
	mdPartyExternalId,
	mdPartyRelationship,
	mdPartyRole,
	mdPaymentTerm,
	mdTaxRegistration,
	mdWarehouse,
	mdWarehouseExternalId,
	refCountry,
	refCurrency,
	refLanguage,
	refTimeZone,
	refUom,
	refUomDimension,
} from "../src/schema/master-data";

const IN_SCOPE_TABLES = {
	refCountry,
	refCurrency,
	refLanguage,
	refTimeZone,
	refUomDimension,
	refUom,
	mdParty,
	mdItemGroup,
	mdItem,
	mdWarehouse,
	mdPaymentTerm,
	mdTaxRegistration,
	mdPartyRole,
	mdPartyAddress,
	mdPartyContact,
	mdPartyExternalId,
	mdPartyRelationship,
	mdItemUom,
	mdItemBarcode,
	mdItemExternalId,
	mdItemAlias,
	mdWarehouseExternalId,
	mdItemTemplate,
	mdItemTemplateAttribute,
	mdItemTemplateAttributeOption,
	mdItemVariant,
	mdItemVariantAttributeValue,
	mdChangeRequest,
	mdImportBatch,
} as const;

describe("@afenda/db master-data schema (Authority B)", () => {
	it("exports all Authority B tables", () => {
		const names = Object.values(IN_SCOPE_TABLES).map((table) =>
			getTableName(table),
		);
		expect(names.sort()).toEqual(
			[
				"md_change_request",
				"md_import_batch",
				"md_item",
				"md_item_alias",
				"md_item_barcode",
				"md_item_external_id",
				"md_item_group",
				"md_item_template",
				"md_item_template_attribute",
				"md_item_template_attribute_option",
				"md_item_uom",
				"md_item_variant",
				"md_item_variant_attribute_value",
				"md_party",
				"md_party_address",
				"md_party_contact",
				"md_party_external_id",
				"md_party_relationship",
				"md_party_role",
				"md_payment_term",
				"md_tax_registration",
				"md_warehouse",
				"md_warehouse_external_id",
				"ref_country",
				"ref_currency",
				"ref_language",
				"ref_time_zone",
				"ref_uom",
				"ref_uom_dimension",
			].sort(),
		);
	});

	it("registers md_* hard-tenant roots", () => {
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("md_party");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("md_item_template");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("md_item_variant");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("md_payment_term");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("md_tax_registration");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("md_change_request");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("md_import_batch");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toHaveLength(65);
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("payment_account");
	});

	it("requires organization_id NOT NULL on md_* roots", () => {
		for (const table of [
			mdParty,
			mdItemGroup,
			mdItem,
			mdWarehouse,
			mdItemTemplate,
			mdItemVariant,
			mdPaymentTerm,
			mdTaxRegistration,
		]) {
			const columns = getTableColumns(table);
			expect(columns.organizationId.notNull).toBe(true);
		}
	});

	it("wires md_item.base_uom_id to platform ref_uom (not org md_uom)", () => {
		const itemCols = getTableColumns(mdItem);
		expect(itemCols.baseUomId.notNull).toBe(true);
		expect(itemCols.itemGroupId.notNull).toBe(true);
		expect(getTableName(refUom)).toBe("ref_uom");
		expect(getTableColumns(refUom).dimensionId.notNull).toBe(true);
		expect(getTableName(refUomDimension)).toBe("ref_uom_dimension");
	});

	it("stores variant attribute values as typed columns (no JSON bag)", () => {
		const columns = getTableColumns(mdItemVariantAttributeValue);
		expect(columns.valueText).toBeDefined();
		expect(columns.optionId).toBeDefined();
		expect(
			Object.keys(columns).some((key) =>
				/json|variantJson|variant_json/i.test(key),
			),
		).toBe(false);
		expect(getTableColumns(mdItemVariant).combinationKey).toBeDefined();
	});

	it("keeps party free of customer/supplier booleans", () => {
		const columns = getTableColumns(mdParty);
		expect(columns.partyKind).toBeDefined();
		expect(
			Object.keys(columns).some((key) =>
				/isCustomer|isSupplier|is_customer|is_supplier/i.test(key),
			),
		).toBe(false);
	});

	it("does not define shadow or out-of-scope masters", async () => {
		const schema = await import("../src/schema/master-data");
		const keys = Object.keys(schema);
		expect(keys).not.toContain("salesCustomer");
		expect(keys).not.toContain("purchaseSupplier");
		expect(keys).not.toContain("inventoryProduct");
		expect(keys).not.toContain("mdUom");
		expect(keys.some((key) => /sales_customer|md_uom/i.test(key))).toBe(false);
	});
});
