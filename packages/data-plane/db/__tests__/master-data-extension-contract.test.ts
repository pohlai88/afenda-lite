import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
	mdItemAlias,
	mdItemBarcode,
	mdItemExternalId,
	mdItemTemplateAttribute,
	mdItemTemplateAttributeOption,
	mdItemUom,
	mdItemVariant,
	mdItemVariantAttributeValue,
	mdPartyAddress,
	mdPartyContact,
	mdPartyExternalId,
	mdPartyRelationship,
	mdPartyRole,
	mdWarehouseExternalId,
} from "../src/schema/master-data";
import { readCurrentMigrationSql } from "./helpers/current-migration-sql";

const MUTABLE_EXTENSION_TABLES = [
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
	mdItemTemplateAttribute,
	mdItemTemplateAttributeOption,
	mdItemVariant,
	mdItemVariantAttributeValue,
] as const;

const EFFECTIVE_DATED_EXTENSION_TABLES = [mdPartyRole, mdItemUom] as const;

const COMPOSITE_FOREIGN_KEYS = [
	"md_party_role_org_party_fk",
	"md_party_address_org_party_fk",
	"md_party_contact_org_party_fk",
	"md_party_external_id_org_party_fk",
	"md_party_relationship_org_from_fk",
	"md_party_relationship_org_to_fk",
	"md_item_uom_org_item_fk",
	"md_item_barcode_org_item_fk",
	"md_item_external_id_org_item_fk",
	"md_item_alias_org_item_fk",
	"md_warehouse_external_id_org_warehouse_fk",
	"md_item_template_attribute_org_template_fk",
	"md_item_template_attribute_option_org_attribute_fk",
	"md_item_variant_org_item_fk",
	"md_item_variant_org_template_fk",
	"md_item_variant_attribute_value_org_variant_fk",
	"md_item_variant_attribute_value_org_attribute_fk",
	"md_item_variant_attribute_value_org_option_fk",
	"md_item_variant_attribute_value_option_org_value_fk",
	"md_item_variant_attribute_value_option_org_option_fk",
] as const;

const PRIMARY_EXTENSION_INDEXES = [
	"md_party_address_primary_purpose_active_uidx",
	"md_party_contact_primary_type_purpose_uidx",
	"md_item_barcode_primary_item_uom_uidx",
	"md_item_uom_default_purchase_uidx",
	"md_item_uom_default_sales_uidx",
] as const;

const ACTIVE_EXTERNAL_ID_INDEXES = [
	"md_party_external_id_active_identity_uidx",
	"md_item_external_id_active_identity_uidx",
	"md_warehouse_external_id_active_identity_uidx",
] as const;

describe("master-data extension common contract", () => {
	it("requires tenant, lifecycle, version, audit, and archive columns", () => {
		for (const table of MUTABLE_EXTENSION_TABLES) {
			const columns = getTableColumns(table);
			expect(columns.organizationId.notNull).toBe(true);
			expect(columns.status.notNull).toBe(true);
			expect(columns.version.notNull).toBe(true);
			expect(columns.createdAt.notNull).toBe(true);
			expect(columns.createdBy.notNull).toBe(true);
			expect(columns.updatedAt.notNull).toBe(true);
			expect(columns.updatedBy.notNull).toBe(true);
			expect(columns.archivedAt).toBeDefined();
			expect(columns.archivedBy).toBeDefined();
		}
	});

	it("keeps effective ranges on effective-dated extensions", () => {
		for (const table of EFFECTIVE_DATED_EXTENSION_TABLES) {
			const columns = getTableColumns(table);
			expect(columns.validFrom).toBeDefined();
			expect(columns.validTo).toBeDefined();
		}
		const addressColumns = getTableColumns(mdPartyAddress);
		expect(addressColumns.effectiveFrom).toBeDefined();
		expect(addressColumns.effectiveTo).toBeDefined();
		const contactColumns = getTableColumns(mdPartyContact);
		expect(contactColumns.effectiveFrom).toBeDefined();
		expect(contactColumns.effectiveTo).toBeDefined();
		const relationshipColumns = getTableColumns(mdPartyRelationship);
		expect(relationshipColumns.effectiveFrom).toBeDefined();
		expect(relationshipColumns.effectiveTo).toBeDefined();
	});

	it("governs canonical party relationship semantics", () => {
		const columns = getTableColumns(mdPartyRelationship);
		expect(columns.sourcePartyId.notNull).toBe(true);
		expect(columns.targetPartyId.notNull).toBe(true);
		expect(columns.relationshipType.notNull).toBe(true);
		expect(columns.direction.notNull).toBe(true);

		const migrationSql = readCurrentMigrationSql();
		for (const constraint of [
			"md_party_relationship_non_reflexive_ck",
			"md_party_relationship_direction_ck",
			"md_party_relationship_type_ck",
			"md_party_relationship_semantics_ck",
			"md_party_relationship_status_ck",
			"md_party_relationship_effective_range_ck",
		]) {
			expect(migrationSql).toContain(`ADD CONSTRAINT "${constraint}"`);
		}
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "md_party_relationship_active_pair_type_uidx"',
		);
	});

	it("governs canonical item UoM conversion semantics", () => {
		const columns = getTableColumns(mdItemUom);
		expect(columns.alternateUomId.notNull).toBe(true);
		expect(columns.conversionFactor.notNull).toBe(true);
		expect(columns.roundingScale.notNull).toBe(true);
		expect(columns.isPurchaseUom.notNull).toBe(true);
		expect(columns.isSalesUom.notNull).toBe(true);
		expect(columns.isInventoryUom.notNull).toBe(true);
		expect(columns.isDefaultPurchaseUom.notNull).toBe(true);
		expect(columns.isDefaultSalesUom.notNull).toBe(true);
		expect(columns.compatibilityMode.notNull).toBe(true);

		const migrationSql = readCurrentMigrationSql();
		for (const constraint of [
			"md_item_uom_factor_ck",
			"md_item_uom_rounding_scale_ck",
			"md_item_uom_default_purchase_ck",
			"md_item_uom_default_sales_ck",
			"md_item_uom_compatibility_mode_ck",
			"md_item_uom_packaging_approval_ck",
			"md_item_uom_status_ck",
		]) {
			expect(migrationSql).toContain(`ADD CONSTRAINT "${constraint}"`);
		}
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "md_item_uom_active_item_alternate_uidx"',
		);
	});

	it("keeps party addresses structured and governed", () => {
		const columns = getTableColumns(mdPartyAddress);
		expect(columns.purpose.notNull).toBe(true);
		expect(columns.line1.notNull).toBe(true);
		expect(columns.line2).toBeDefined();
		expect(columns.line3).toBeDefined();
		expect(columns.city.notNull).toBe(true);
		expect(columns.administrativeArea).toBeDefined();
		expect(columns.postalCode).toBeDefined();
		expect(columns.countryId.notNull).toBe(true);
		expect(columns.attention).toBeDefined();
		expect(columns.isPrimary.notNull).toBe(true);
		expect(columns.validationStatus.notNull).toBe(true);

		const migrationSql = readCurrentMigrationSql();
		for (const constraint of [
			"md_party_address_type_check",
			"md_party_address_purpose_check",
			"md_party_address_validation_status_check",
			"md_party_address_status_check",
			"md_party_address_effective_range_check",
		]) {
			expect(migrationSql).toContain(`ADD CONSTRAINT "${constraint}"`);
		}
	});

	it("keeps party contacts normalized, explicitly verified, and governed", () => {
		const columns = getTableColumns(mdPartyContact);
		expect(columns.contactType.notNull).toBe(true);
		expect(columns.value.notNull).toBe(true);
		expect(columns.normalizedValue.notNull).toBe(true);
		expect(columns.label).toBeDefined();
		expect(columns.verificationStatus.notNull).toBe(true);
		expect(columns.verifiedAt).toBeDefined();

		const migrationSql = readCurrentMigrationSql();
		for (const constraint of [
			"md_party_contact_type_check",
			"md_party_contact_verification_status_check",
			"md_party_contact_verification_timestamp_check",
			"md_party_contact_status_check",
			"md_party_contact_effective_range_check",
		]) {
			expect(migrationSql).toContain(`ADD CONSTRAINT "${constraint}"`);
		}
		expect(migrationSql).toContain(
			'CREATE INDEX "md_party_contact_org_normalized_value_idx"',
		);
	});

	it("migrates every organization-owned parent link to a composite foreign key", () => {
		const migrationSql = readCurrentMigrationSql();
		for (const constraint of COMPOSITE_FOREIGN_KEYS) {
			expect(migrationSql).toContain(`CONSTRAINT "${constraint}"`);
			expect(migrationSql).toMatch(
				new RegExp(`${constraint}[^;]+FOREIGN KEY \\("organization_id",`),
			);
		}
		expect(migrationSql).toContain("ON UPDATE no action NOT VALID");
	});

	it("creates parent composite uniqueness before attaching foreign keys", () => {
		const migrationSql = readCurrentMigrationSql();
		const parentUnique = migrationSql.indexOf("md_party_org_id_uidx");
		const childForeignKey = migrationSql.indexOf("md_party_role_org_party_fk");
		expect(parentUnique).toBeGreaterThan(-1);
		expect(childForeignKey).toBeGreaterThan(parentUnique);
	});

	it("enforces primary child identities under concurrency", () => {
		const migrationSql = readCurrentMigrationSql();
		for (const index of PRIMARY_EXTENSION_INDEXES) {
			expect(migrationSql).toContain(`CREATE UNIQUE INDEX "${index}"`);
		}
		expect(migrationSql).toContain(
			'WHERE "md_party_address"."is_primary" = true AND "md_party_address"."status" = \'active\'',
		);
		expect(migrationSql).toContain(
			'WHERE "md_party_contact"."is_primary" = true',
		);
		expect(migrationSql).toContain(
			'"md_party_contact"."status" = \'active\' AND "md_party_contact"."archived_at" IS NULL',
		);
		expect(migrationSql).toContain(
			'WHERE "md_item_barcode"."is_primary" = true',
		);
	});

	it("enforces active external identifiers and barcode scopes in the database", () => {
		const migrationSql = readCurrentMigrationSql();

		for (const index of ACTIVE_EXTERNAL_ID_INDEXES) {
			expect(migrationSql).toContain(`CREATE UNIQUE INDEX "${index}"`);
		}
		expect(migrationSql).toMatch(
			/"organization_id"[\s\S]+"source_system"[\s\S]+"external_id_type"[\s\S]+"normalized_value"/,
		);
		expect(migrationSql).toContain("\"status\" = 'active'");
		expect(migrationSql).toContain('"archived_at" IS NULL');

		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "md_item_barcode_active_identity_uidx"',
		);
		expect(migrationSql).toContain(
			'ON "md_item_barcode" USING btree ("organization_id", "symbology", "normalized_value")',
		);
		expect(migrationSql).toContain(
			'"status" = \'active\' AND "archived_at" IS NULL',
		);
	});

	it("enforces variant attribute and option identities in the database", () => {
		const migrationSql = readCurrentMigrationSql();

		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "md_item_variant_attribute_value_current_uidx"',
		);
		expect(migrationSql).toContain(
			'"organization_id", "variant_id", "attribute_id"',
		);
		expect(migrationSql).toContain(
			'"status" = \'active\' AND "archived_at" IS NULL',
		);
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "md_item_template_attribute_option_org_attr_code_uidx"',
		);
		expect(migrationSql).toContain(
			'"organization_id","attribute_id","normalized_code"',
		);
	});

	it("enforces the party-role standard child lifecycle and archives legacy retirement", () => {
		const migrationSql = readCurrentMigrationSql();
		expect(migrationSql).toContain("md_party_role_status_check");
		expect(migrationSql).toContain(
			"IN ('draft', 'active', 'inactive', 'archived')",
		);
		expect(migrationSql).toContain("WHERE \"status\" = 'retired'");
		expect(migrationSql).toContain(
			'WHERE "md_party_role"."archived_at" IS NULL',
		);
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "md_party_role_org_party_code_active_uidx"',
		);
		expect(migrationSql).toContain(
			'WHERE "md_party_role"."status" = \'active\' AND "md_party_role"."archived_at" IS NULL',
		);
	});
});
