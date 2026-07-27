/**
 * Master-data permission codes — ERP-owned; must stay aligned with
 * `@afenda/db` PLATFORM_PERMISSION_V1 (master_data.*).
 */

export const MASTER_DATA_PERMISSION_READ = "master_data.read" as const;
export const MASTER_DATA_PERMISSION_MANAGE = "master_data.manage" as const;
export const MASTER_DATA_PERMISSION_APPROVE = "master_data.approve" as const;
export const MASTER_DATA_PERMISSION_IMPORT_APPROVE =
	"master_data.import_approve" as const;

export const MASTER_DATA_PERMISSION_PARTY_ACTIVATE =
	"master_data.party_activate" as const;
export const MASTER_DATA_PERMISSION_PARTY_INACTIVATE =
	"master_data.party_inactivate" as const;
export const MASTER_DATA_PERMISSION_PARTY_BLOCK =
	"master_data.party_block" as const;
export const MASTER_DATA_PERMISSION_PARTY_UNBLOCK =
	"master_data.party_unblock" as const;
export const MASTER_DATA_PERMISSION_PARTY_RETIRE =
	"master_data.party_retire" as const;
export const MASTER_DATA_PERMISSION_PARTY_ARCHIVE =
	"master_data.party_archive" as const;
export const MASTER_DATA_PERMISSION_PARTY_MERGE =
	"master_data.party_merge" as const;
export const MASTER_DATA_PERMISSION_ITEM_ACTIVATE =
	"master_data.item_activate" as const;
export const MASTER_DATA_PERMISSION_ITEM_INACTIVATE =
	"master_data.item_inactivate" as const;
export const MASTER_DATA_PERMISSION_ITEM_BLOCK =
	"master_data.item_block" as const;
export const MASTER_DATA_PERMISSION_ITEM_UNBLOCK =
	"master_data.item_unblock" as const;
export const MASTER_DATA_PERMISSION_ITEM_RETIRE =
	"master_data.item_retire" as const;
export const MASTER_DATA_PERMISSION_ITEM_ARCHIVE =
	"master_data.item_archive" as const;
export const MASTER_DATA_PERMISSION_ITEM_GROUP_ACTIVATE =
	"master_data.item_group_activate" as const;
export const MASTER_DATA_PERMISSION_ITEM_GROUP_INACTIVATE =
	"master_data.item_group_inactivate" as const;
export const MASTER_DATA_PERMISSION_ITEM_GROUP_ARCHIVE =
	"master_data.item_group_archive" as const;
export const MASTER_DATA_PERMISSION_WAREHOUSE_ACTIVATE =
	"master_data.warehouse_activate" as const;
export const MASTER_DATA_PERMISSION_WAREHOUSE_INACTIVATE =
	"master_data.warehouse_inactivate" as const;
export const MASTER_DATA_PERMISSION_WAREHOUSE_BLOCK =
	"master_data.warehouse_block" as const;
export const MASTER_DATA_PERMISSION_WAREHOUSE_UNBLOCK =
	"master_data.warehouse_unblock" as const;
export const MASTER_DATA_PERMISSION_WAREHOUSE_RETIRE =
	"master_data.warehouse_retire" as const;
export const MASTER_DATA_PERMISSION_WAREHOUSE_ARCHIVE =
	"master_data.warehouse_archive" as const;
export const MASTER_DATA_PERMISSION_PAYMENT_TERM_ACTIVATE =
	"master_data.payment_term_activate" as const;
export const MASTER_DATA_PERMISSION_PAYMENT_TERM_INACTIVATE =
	"master_data.payment_term_inactivate" as const;
export const MASTER_DATA_PERMISSION_PAYMENT_TERM_ARCHIVE =
	"master_data.payment_term_archive" as const;
export const MASTER_DATA_PERMISSION_TAX_REGISTRATION_ACTIVATE =
	"master_data.tax_registration_activate" as const;
export const MASTER_DATA_PERMISSION_TAX_REGISTRATION_REVOKE =
	"master_data.tax_registration_revoke" as const;
export const MASTER_DATA_PERMISSION_TAX_REGISTRATION_ARCHIVE =
	"master_data.tax_registration_archive" as const;
export const MASTER_DATA_PERMISSION_TAX_REGISTRATION_RESTORE =
	"master_data.tax_registration_restore" as const;
export const MASTER_DATA_PERMISSION_ITEM_TEMPLATE_ACTIVATE =
	"master_data.item_template_activate" as const;
export const MASTER_DATA_PERMISSION_ITEM_TEMPLATE_INACTIVATE =
	"master_data.item_template_inactivate" as const;
export const MASTER_DATA_PERMISSION_ITEM_TEMPLATE_RETIRE =
	"master_data.item_template_retire" as const;
export const MASTER_DATA_PERMISSION_ITEM_VARIANT_ACTIVATE =
	"master_data.item_variant_activate" as const;
export const MASTER_DATA_PERMISSION_ITEM_VARIANT_INACTIVATE =
	"master_data.item_variant_inactivate" as const;
export const MASTER_DATA_PERMISSION_ITEM_VARIANT_BLOCK =
	"master_data.item_variant_block" as const;
export const MASTER_DATA_PERMISSION_ITEM_VARIANT_UNBLOCK =
	"master_data.item_variant_unblock" as const;
export const MASTER_DATA_PERMISSION_ITEM_VARIANT_RETIRE =
	"master_data.item_variant_retire" as const;
export const MASTER_DATA_PERMISSION_ITEM_VARIANT_ARCHIVE =
	"master_data.item_variant_archive" as const;

export const MASTER_DATA_PERMISSION_PARTY_ROLE_MANAGE =
	"master_data.party_role_manage" as const;
export const MASTER_DATA_PERMISSION_PARTY_ADDRESS_MANAGE =
	"master_data.party_address_manage" as const;
export const MASTER_DATA_PERMISSION_PARTY_CONTACT_MANAGE =
	"master_data.party_contact_manage" as const;
export const MASTER_DATA_PERMISSION_PARTY_CONTACT_VERIFY =
	"master_data.party_contact_verify" as const;
export const MASTER_DATA_PERMISSION_PARTY_EXTERNAL_ID_MANAGE =
	"master_data.party_external_id_manage" as const;
export const MASTER_DATA_PERMISSION_PARTY_EXTERNAL_ID_REGULATORY_MANAGE =
	"master_data.party_external_id_regulatory_manage" as const;
export const MASTER_DATA_PERMISSION_PARTY_RELATIONSHIP_MANAGE =
	"master_data.party_relationship_manage" as const;
export const MASTER_DATA_PERMISSION_PARTY_RELATIONSHIP_CONTROL_MANAGE =
	"master_data.party_relationship_control_manage" as const;
export const MASTER_DATA_PERMISSION_ITEM_UOM_MANAGE =
	"master_data.item_uom_manage" as const;
export const MASTER_DATA_PERMISSION_ITEM_BARCODE_MANAGE =
	"master_data.item_barcode_manage" as const;
export const MASTER_DATA_PERMISSION_ITEM_EXTERNAL_ID_MANAGE =
	"master_data.item_external_id_manage" as const;
export const MASTER_DATA_PERMISSION_ITEM_ALIAS_MANAGE =
	"master_data.item_alias_manage" as const;
export const MASTER_DATA_PERMISSION_WAREHOUSE_EXTERNAL_ID_MANAGE =
	"master_data.warehouse_external_id_manage" as const;
export const MASTER_DATA_PERMISSION_ITEM_TEMPLATE_ATTRIBUTE_MANAGE =
	"master_data.item_template_attribute_manage" as const;
export const MASTER_DATA_PERMISSION_ITEM_TEMPLATE_OPTION_MANAGE =
	"master_data.item_template_option_manage" as const;
export const MASTER_DATA_PERMISSION_ITEM_VARIANT_ATTRIBUTE_MANAGE =
	"master_data.item_variant_attribute_manage" as const;
export const MASTER_DATA_PERMISSION_ITEM_VARIANT_DEFINING_ATTRIBUTE_MANAGE =
	"master_data.item_variant_defining_attribute_manage" as const;

export const MASTER_DATA_PERMISSION_CODES = [
	MASTER_DATA_PERMISSION_READ,
	MASTER_DATA_PERMISSION_MANAGE,
	MASTER_DATA_PERMISSION_APPROVE,
	MASTER_DATA_PERMISSION_IMPORT_APPROVE,
	MASTER_DATA_PERMISSION_PARTY_ACTIVATE,
	MASTER_DATA_PERMISSION_PARTY_INACTIVATE,
	MASTER_DATA_PERMISSION_PARTY_BLOCK,
	MASTER_DATA_PERMISSION_PARTY_UNBLOCK,
	MASTER_DATA_PERMISSION_PARTY_RETIRE,
	MASTER_DATA_PERMISSION_PARTY_ARCHIVE,
	MASTER_DATA_PERMISSION_PARTY_MERGE,
	MASTER_DATA_PERMISSION_ITEM_ACTIVATE,
	MASTER_DATA_PERMISSION_ITEM_INACTIVATE,
	MASTER_DATA_PERMISSION_ITEM_BLOCK,
	MASTER_DATA_PERMISSION_ITEM_UNBLOCK,
	MASTER_DATA_PERMISSION_ITEM_RETIRE,
	MASTER_DATA_PERMISSION_ITEM_ARCHIVE,
	MASTER_DATA_PERMISSION_ITEM_GROUP_ACTIVATE,
	MASTER_DATA_PERMISSION_ITEM_GROUP_INACTIVATE,
	MASTER_DATA_PERMISSION_ITEM_GROUP_ARCHIVE,
	MASTER_DATA_PERMISSION_WAREHOUSE_ACTIVATE,
	MASTER_DATA_PERMISSION_WAREHOUSE_INACTIVATE,
	MASTER_DATA_PERMISSION_WAREHOUSE_BLOCK,
	MASTER_DATA_PERMISSION_WAREHOUSE_UNBLOCK,
	MASTER_DATA_PERMISSION_WAREHOUSE_RETIRE,
	MASTER_DATA_PERMISSION_WAREHOUSE_ARCHIVE,
	MASTER_DATA_PERMISSION_PAYMENT_TERM_ACTIVATE,
	MASTER_DATA_PERMISSION_PAYMENT_TERM_INACTIVATE,
	MASTER_DATA_PERMISSION_PAYMENT_TERM_ARCHIVE,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_ACTIVATE,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_REVOKE,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_ARCHIVE,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_RESTORE,
	MASTER_DATA_PERMISSION_ITEM_TEMPLATE_ACTIVATE,
	MASTER_DATA_PERMISSION_ITEM_TEMPLATE_INACTIVATE,
	MASTER_DATA_PERMISSION_ITEM_TEMPLATE_RETIRE,
	MASTER_DATA_PERMISSION_ITEM_VARIANT_ACTIVATE,
	MASTER_DATA_PERMISSION_ITEM_VARIANT_INACTIVATE,
	MASTER_DATA_PERMISSION_ITEM_VARIANT_BLOCK,
	MASTER_DATA_PERMISSION_ITEM_VARIANT_UNBLOCK,
	MASTER_DATA_PERMISSION_ITEM_VARIANT_RETIRE,
	MASTER_DATA_PERMISSION_ITEM_VARIANT_ARCHIVE,
	MASTER_DATA_PERMISSION_PARTY_ROLE_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_ADDRESS_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_CONTACT_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_CONTACT_VERIFY,
	MASTER_DATA_PERMISSION_PARTY_EXTERNAL_ID_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_EXTERNAL_ID_REGULATORY_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_RELATIONSHIP_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_RELATIONSHIP_CONTROL_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_UOM_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_BARCODE_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_EXTERNAL_ID_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_ALIAS_MANAGE,
	MASTER_DATA_PERMISSION_WAREHOUSE_EXTERNAL_ID_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_TEMPLATE_ATTRIBUTE_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_TEMPLATE_OPTION_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_VARIANT_ATTRIBUTE_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_VARIANT_DEFINING_ATTRIBUTE_MANAGE,
] as const;
