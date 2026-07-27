export type MasterDataDatabaseConstraintKind =
	| "organization_normalized_code_unique"
	| "version_positive_check"
	| "conversion_factor_positive_check"
	| "non_reflexive_party_relationship_check"
	| "same_authority_foreign_key"
	| "primary_record_partial_unique"
	| "active_external_id_partial_unique"
	| "barcode_scope_unique"
	| "variant_attribute_unique"
	| "template_attribute_option_code_unique";

export type MasterDataDatabaseConstraintRequirement = Readonly<{
	kind: MasterDataDatabaseConstraintKind;
	owner: "@afenda/db";
	rationale: string;
	constraintNames: readonly string[];
}>;

export const MASTER_DATA_DATABASE_CONSTRAINT_REQUIREMENTS = [
	{
		kind: "organization_normalized_code_unique",
		owner: "@afenda/db",
		rationale:
			"Code-bearing organization masters must reject duplicate live normalized codes per organization.",
		constraintNames: [
			"md_party_org_normalized_code_live_uidx",
			"md_item_group_org_normalized_code_live_uidx",
			"md_item_org_normalized_code_live_uidx",
			"md_warehouse_org_normalized_code_live_uidx",
			"md_payment_term_org_normalized_code_live_uidx",
			"md_item_template_org_normalized_code_live_uidx",
			"md_change_request_org_normalized_code_uidx",
		],
	},
	{
		kind: "version_positive_check",
		owner: "@afenda/db",
		rationale:
			"CAS versions are database-enforced positive integers for mutable authoritative md_* rows.",
		constraintNames: [
			"md_org_dimension_version_ck",
			"md_party_version_ck",
			"md_item_group_version_ck",
			"md_item_version_ck",
			"md_warehouse_version_ck",
			"md_payment_term_version_ck",
			"md_tax_registration_version_ck",
			"md_item_template_version_ck",
			"md_change_request_version_ck",
			"md_party_role_version_ck",
			"md_party_address_version_ck",
			"md_party_contact_version_ck",
			"md_party_external_id_version_ck",
			"md_party_relationship_version_ck",
			"md_item_uom_version_ck",
			"md_item_barcode_version_ck",
			"md_item_external_id_version_ck",
			"md_item_alias_version_ck",
			"md_warehouse_external_id_version_ck",
			"md_item_template_attribute_version_ck",
			"md_item_template_attribute_option_version_ck",
			"md_item_variant_version_ck",
			"md_item_variant_attribute_value_version_ck",
		],
	},
	{
		kind: "conversion_factor_positive_check",
		owner: "@afenda/db",
		rationale: "Item UoM conversions must reject zero and negative factors.",
		constraintNames: ["md_item_uom_factor_ck"],
	},
	{
		kind: "non_reflexive_party_relationship_check",
		owner: "@afenda/db",
		rationale: "Party relationships must not link a party to itself.",
		constraintNames: ["md_party_relationship_non_reflexive_ck"],
	},
	{
		kind: "same_authority_foreign_key",
		owner: "@afenda/db",
		rationale:
			"Same-authority md_* references include organization_id where feasible to prevent cross-tenant references.",
		constraintNames: [
			"md_org_dimension_org_parent_fk",
			"md_org_dimension_org_supersedes_fk",
			"md_party_merged_into_org_fk",
			"md_item_group_org_parent_fk",
			"md_item_org_group_fk",
			"md_warehouse_org_parent_fk",
			"md_tax_registration_org_party_fk",
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
		],
	},
	{
		kind: "primary_record_partial_unique",
		owner: "@afenda/db",
		rationale:
			"Primary contacts, addresses, barcodes, and default UoMs must remain single-primary in their intended active scope.",
		constraintNames: [
			"md_party_address_primary_purpose_active_uidx",
			"md_party_contact_primary_type_purpose_uidx",
			"md_item_barcode_primary_item_uom_uidx",
			"md_item_uom_default_purchase_uidx",
			"md_item_uom_default_sales_uidx",
		],
	},
	{
		kind: "active_external_id_partial_unique",
		owner: "@afenda/db",
		rationale:
			"Active external identifiers must be unique within organization/source/type/value scopes.",
		constraintNames: [
			"md_party_external_id_active_identity_uidx",
			"md_item_external_id_active_identity_uidx",
			"md_warehouse_external_id_active_identity_uidx",
		],
	},
	{
		kind: "barcode_scope_unique",
		owner: "@afenda/db",
		rationale:
			"Active item barcodes are unique by organization, symbology, and normalized value.",
		constraintNames: ["md_item_barcode_active_identity_uidx"],
	},
	{
		kind: "variant_attribute_unique",
		owner: "@afenda/db",
		rationale:
			"Current active variant attribute values are unique per organization, variant, and attribute.",
		constraintNames: ["md_item_variant_attribute_value_current_uidx"],
	},
	{
		kind: "template_attribute_option_code_unique",
		owner: "@afenda/db",
		rationale:
			"Template attribute options reject duplicate normalized option codes per attribute.",
		constraintNames: ["md_item_template_attribute_option_org_attr_code_uidx"],
	},
] as const satisfies readonly MasterDataDatabaseConstraintRequirement[];
