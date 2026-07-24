/** Master-data command / query IDs — package authority for MODULE registers. */

export const MASTER_COMMAND_ORGANIZATION_DIMENSION_CREATE =
	"master_data.organization_dimension.create" as const;
export const MASTER_COMMAND_PARTY_CREATE = "master_data.party.create" as const;
export const MASTER_COMMAND_PARTY_UPDATE = "master_data.party.update" as const;
export const MASTER_COMMAND_PARTY_ACTIVATE =
	"master_data.party.activate" as const;
export const MASTER_COMMAND_PARTY_INACTIVE =
	"master_data.party.inactive" as const;
export const MASTER_COMMAND_PARTY_BLOCK = "master_data.party.block" as const;
export const MASTER_COMMAND_PARTY_RESTORE =
	"master_data.party.restore" as const;
export const MASTER_COMMAND_PARTY_RETIRE = "master_data.party.retire" as const;
export const MASTER_COMMAND_PARTY_MERGE = "master_data.party.merge" as const;
export const MASTER_COMMAND_ITEM_CREATE = "master_data.item.create" as const;
export const MASTER_COMMAND_ITEM_UPDATE = "master_data.item.update" as const;
export const MASTER_COMMAND_ITEM_ACTIVATE =
	"master_data.item.activate" as const;
export const MASTER_COMMAND_ITEM_INACTIVE =
	"master_data.item.inactive" as const;
export const MASTER_COMMAND_ITEM_RETIRE = "master_data.item.retire" as const;
export const MASTER_COMMAND_ITEM_GROUP_CREATE =
	"master_data.item_group.create" as const;
export const MASTER_COMMAND_ITEM_GROUP_UPDATE =
	"master_data.item_group.update" as const;
export const MASTER_COMMAND_ITEM_GROUP_ACTIVATE =
	"master_data.item_group.activate" as const;
export const MASTER_COMMAND_ITEM_GROUP_INACTIVE =
	"master_data.item_group.inactive" as const;
export const MASTER_COMMAND_ITEM_GROUP_RETIRE =
	"master_data.item_group.retire" as const;
export const MASTER_COMMAND_WAREHOUSE_CREATE =
	"master_data.warehouse.create" as const;
export const MASTER_COMMAND_WAREHOUSE_UPDATE =
	"master_data.warehouse.update" as const;
export const MASTER_COMMAND_WAREHOUSE_ACTIVATE =
	"master_data.warehouse.activate" as const;
export const MASTER_COMMAND_WAREHOUSE_INACTIVE =
	"master_data.warehouse.inactive" as const;
export const MASTER_COMMAND_WAREHOUSE_MOVE =
	"master_data.warehouse.move" as const;
export const MASTER_COMMAND_WAREHOUSE_RETIRE =
	"master_data.warehouse.retire" as const;
export const MASTER_COMMAND_PAYMENT_TERM_CREATE =
	"master_data.payment_term.create" as const;
export const MASTER_COMMAND_PAYMENT_TERM_UPDATE =
	"master_data.payment_term.update" as const;
export const MASTER_COMMAND_PAYMENT_TERM_ACTIVATE =
	"master_data.payment_term.activate" as const;
export const MASTER_COMMAND_PAYMENT_TERM_INACTIVE =
	"master_data.payment_term.inactive" as const;
export const MASTER_COMMAND_PAYMENT_TERM_RETIRE =
	"master_data.payment_term.retire" as const;
export const MASTER_COMMAND_TAX_REGISTRATION_CREATE =
	"master_data.tax_registration.create" as const;
export const MASTER_COMMAND_TAX_REGISTRATION_UPDATE =
	"master_data.tax_registration.update" as const;
export const MASTER_COMMAND_TAX_REGISTRATION_ACTIVATE =
	"master_data.tax_registration.activate" as const;
export const MASTER_COMMAND_TAX_REGISTRATION_BLOCK =
	"master_data.tax_registration.block" as const;
export const MASTER_COMMAND_TAX_REGISTRATION_RESTORE =
	"master_data.tax_registration.restore" as const;
export const MASTER_COMMAND_TAX_REGISTRATION_RETIRE =
	"master_data.tax_registration.retire" as const;
export const MASTER_COMMAND_PARTY_ROLE_CREATE =
	"master_data.party_role.create" as const;
export const MASTER_COMMAND_PARTY_ROLE_ACTIVATE =
	"master_data.party_role.activate" as const;
export const MASTER_COMMAND_PARTY_ROLE_RETIRE =
	"master_data.party_role.retire" as const;
export const MASTER_COMMAND_PARTY_ADDRESS_CREATE =
	"master_data.party_address.create" as const;
export const MASTER_COMMAND_PARTY_ADDRESS_UPDATE =
	"master_data.party_address.update" as const;
export const MASTER_COMMAND_PARTY_CONTACT_CREATE =
	"master_data.party_contact.create" as const;
export const MASTER_COMMAND_PARTY_CONTACT_UPDATE =
	"master_data.party_contact.update" as const;
export const MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE =
	"master_data.party_external_id.create" as const;
export const MASTER_COMMAND_PARTY_RELATIONSHIP_CREATE =
	"master_data.party_relationship.create" as const;
export const MASTER_COMMAND_ITEM_UOM_CREATE =
	"master_data.item_uom.create" as const;
export const MASTER_COMMAND_ITEM_BARCODE_CREATE =
	"master_data.item_barcode.create" as const;
export const MASTER_COMMAND_ITEM_EXTERNAL_ID_CREATE =
	"master_data.item_external_id.create" as const;
export const MASTER_COMMAND_ITEM_ALIAS_CREATE =
	"master_data.item_alias.create" as const;
export const MASTER_COMMAND_WAREHOUSE_EXTERNAL_ID_CREATE =
	"master_data.warehouse_external_id.create" as const;
export const MASTER_COMMAND_ITEM_TEMPLATE_CREATE =
	"master_data.item_template.create" as const;
export const MASTER_COMMAND_ITEM_TEMPLATE_UPDATE =
	"master_data.item_template.update" as const;
export const MASTER_COMMAND_ITEM_TEMPLATE_ACTIVATE =
	"master_data.item_template.activate" as const;
export const MASTER_COMMAND_ITEM_TEMPLATE_INACTIVE =
	"master_data.item_template.inactive" as const;
export const MASTER_COMMAND_ITEM_TEMPLATE_RETIRE =
	"master_data.item_template.retire" as const;
export const MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_CREATE =
	"master_data.item_template_attribute.create" as const;
export const MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_OPTION_CREATE =
	"master_data.item_template_attribute_option.create" as const;
export const MASTER_COMMAND_ITEM_VARIANT_CREATE =
	"master_data.item_variant.create" as const;
export const MASTER_COMMAND_ITEM_VARIANT_RETIRE =
	"master_data.item_variant.retire" as const;
export const MASTER_COMMAND_CHANGE_REQUEST_SUBMIT =
	"master_data.change_request.submit" as const;
export const MASTER_COMMAND_CHANGE_REQUEST_APPROVE =
	"master_data.change_request.approve" as const;
export const MASTER_COMMAND_CHANGE_REQUEST_REJECT =
	"master_data.change_request.reject" as const;
export const MASTER_COMMAND_IMPORT_UPSERT_PARTIES =
	"master_data.import.upsert_parties" as const;
export const MASTER_COMMAND_IMPORT_UPSERT_ITEMS =
	"master_data.import.upsert_items" as const;
export const MASTER_COMMAND_IMPORT_UPSERT_ITEM_GROUPS =
	"master_data.import.upsert_item_groups" as const;
export const MASTER_COMMAND_IMPORT_UPSERT_WAREHOUSES =
	"master_data.import.upsert_warehouses" as const;
export const MASTER_COMMAND_IMPORT_VALIDATE_PARTY_BATCH =
	"master_data.import.validate_party_batch" as const;
export const MASTER_COMMAND_SEARCH_REBUILD =
	"master_data.search.rebuild" as const;

export const MASTER_DATA_COMMAND_IDS = [
	MASTER_COMMAND_ORGANIZATION_DIMENSION_CREATE,
	MASTER_COMMAND_PARTY_CREATE,
	MASTER_COMMAND_PARTY_UPDATE,
	MASTER_COMMAND_PARTY_ACTIVATE,
	MASTER_COMMAND_PARTY_INACTIVE,
	MASTER_COMMAND_PARTY_BLOCK,
	MASTER_COMMAND_PARTY_RESTORE,
	MASTER_COMMAND_PARTY_RETIRE,
	MASTER_COMMAND_PARTY_MERGE,
	MASTER_COMMAND_ITEM_CREATE,
	MASTER_COMMAND_ITEM_UPDATE,
	MASTER_COMMAND_ITEM_ACTIVATE,
	MASTER_COMMAND_ITEM_INACTIVE,
	MASTER_COMMAND_ITEM_RETIRE,
	MASTER_COMMAND_ITEM_GROUP_CREATE,
	MASTER_COMMAND_ITEM_GROUP_UPDATE,
	MASTER_COMMAND_ITEM_GROUP_ACTIVATE,
	MASTER_COMMAND_ITEM_GROUP_INACTIVE,
	MASTER_COMMAND_ITEM_GROUP_RETIRE,
	MASTER_COMMAND_WAREHOUSE_CREATE,
	MASTER_COMMAND_WAREHOUSE_UPDATE,
	MASTER_COMMAND_WAREHOUSE_ACTIVATE,
	MASTER_COMMAND_WAREHOUSE_INACTIVE,
	MASTER_COMMAND_WAREHOUSE_MOVE,
	MASTER_COMMAND_WAREHOUSE_RETIRE,
	MASTER_COMMAND_PAYMENT_TERM_CREATE,
	MASTER_COMMAND_PAYMENT_TERM_UPDATE,
	MASTER_COMMAND_PAYMENT_TERM_ACTIVATE,
	MASTER_COMMAND_PAYMENT_TERM_INACTIVE,
	MASTER_COMMAND_PAYMENT_TERM_RETIRE,
	MASTER_COMMAND_TAX_REGISTRATION_CREATE,
	MASTER_COMMAND_TAX_REGISTRATION_UPDATE,
	MASTER_COMMAND_TAX_REGISTRATION_ACTIVATE,
	MASTER_COMMAND_TAX_REGISTRATION_BLOCK,
	MASTER_COMMAND_TAX_REGISTRATION_RESTORE,
	MASTER_COMMAND_TAX_REGISTRATION_RETIRE,
	MASTER_COMMAND_PARTY_ROLE_CREATE,
	MASTER_COMMAND_PARTY_ROLE_ACTIVATE,
	MASTER_COMMAND_PARTY_ROLE_RETIRE,
	MASTER_COMMAND_PARTY_ADDRESS_CREATE,
	MASTER_COMMAND_PARTY_ADDRESS_UPDATE,
	MASTER_COMMAND_PARTY_CONTACT_CREATE,
	MASTER_COMMAND_PARTY_CONTACT_UPDATE,
	MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE,
	MASTER_COMMAND_PARTY_RELATIONSHIP_CREATE,
	MASTER_COMMAND_ITEM_UOM_CREATE,
	MASTER_COMMAND_ITEM_BARCODE_CREATE,
	MASTER_COMMAND_ITEM_EXTERNAL_ID_CREATE,
	MASTER_COMMAND_ITEM_ALIAS_CREATE,
	MASTER_COMMAND_WAREHOUSE_EXTERNAL_ID_CREATE,
	MASTER_COMMAND_ITEM_TEMPLATE_CREATE,
	MASTER_COMMAND_ITEM_TEMPLATE_UPDATE,
	MASTER_COMMAND_ITEM_TEMPLATE_ACTIVATE,
	MASTER_COMMAND_ITEM_TEMPLATE_INACTIVE,
	MASTER_COMMAND_ITEM_TEMPLATE_RETIRE,
	MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_CREATE,
	MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_OPTION_CREATE,
	MASTER_COMMAND_ITEM_VARIANT_CREATE,
	MASTER_COMMAND_ITEM_VARIANT_RETIRE,
	MASTER_COMMAND_CHANGE_REQUEST_SUBMIT,
	MASTER_COMMAND_CHANGE_REQUEST_APPROVE,
	MASTER_COMMAND_CHANGE_REQUEST_REJECT,
	MASTER_COMMAND_IMPORT_UPSERT_PARTIES,
	MASTER_COMMAND_IMPORT_UPSERT_ITEMS,
	MASTER_COMMAND_IMPORT_UPSERT_ITEM_GROUPS,
	MASTER_COMMAND_IMPORT_UPSERT_WAREHOUSES,
	MASTER_COMMAND_IMPORT_VALIDATE_PARTY_BATCH,
	MASTER_COMMAND_SEARCH_REBUILD,
] as const;

export type MasterCommandId = (typeof MASTER_DATA_COMMAND_IDS)[number];

export const MASTER_QUERY_ORGANIZATION_DIMENSION_RESOLVE_AS_OF =
	"master_data.organization_dimension.resolve_as_of" as const;
export const MASTER_QUERY_PARTY_GET_BY_ID =
	"master_data.party.get_by_id" as const;
export const MASTER_QUERY_PARTY_GET_BY_CODE =
	"master_data.party.get_by_code" as const;
export const MASTER_QUERY_PARTY_LIST = "master_data.party.list" as const;
export const MASTER_QUERY_PARTY_FIND_DUPLICATES =
	"master_data.party.find_duplicates" as const;
export const MASTER_QUERY_ITEM_GET_BY_ID =
	"master_data.item.get_by_id" as const;
export const MASTER_QUERY_ITEM_GET_BY_CODE =
	"master_data.item.get_by_code" as const;
export const MASTER_QUERY_ITEM_LIST = "master_data.item.list" as const;
export const MASTER_QUERY_ITEM_GROUP_GET_BY_ID =
	"master_data.item_group.get_by_id" as const;
export const MASTER_QUERY_ITEM_GROUP_GET_BY_CODE =
	"master_data.item_group.get_by_code" as const;
export const MASTER_QUERY_ITEM_GROUP_LIST =
	"master_data.item_group.list" as const;
export const MASTER_QUERY_WAREHOUSE_GET_BY_ID =
	"master_data.warehouse.get_by_id" as const;
export const MASTER_QUERY_WAREHOUSE_GET_BY_CODE =
	"master_data.warehouse.get_by_code" as const;
export const MASTER_QUERY_WAREHOUSE_LIST =
	"master_data.warehouse.list" as const;
export const MASTER_QUERY_PAYMENT_TERM_GET_BY_ID =
	"master_data.payment_term.get_by_id" as const;
export const MASTER_QUERY_PAYMENT_TERM_GET_BY_CODE =
	"master_data.payment_term.get_by_code" as const;
export const MASTER_QUERY_PAYMENT_TERM_LIST =
	"master_data.payment_term.list" as const;
export const MASTER_QUERY_TAX_REGISTRATION_GET_BY_ID =
	"master_data.tax_registration.get_by_id" as const;
export const MASTER_QUERY_TAX_REGISTRATION_LIST =
	"master_data.tax_registration.list" as const;
export const MASTER_QUERY_TAX_REGISTRATION_FIND_BY_PARTY =
	"master_data.tax_registration.find_by_party" as const;
export const MASTER_QUERY_PARTY_ROLE_LIST =
	"master_data.party_role.list" as const;
export const MASTER_QUERY_PARTY_ADDRESS_LIST =
	"master_data.party_address.list" as const;
export const MASTER_QUERY_PARTY_CONTACT_LIST =
	"master_data.party_contact.list" as const;
export const MASTER_QUERY_ITEM_UOM_LIST = "master_data.item_uom.list" as const;
export const MASTER_QUERY_ITEM_FIND_BY_ALIAS =
	"master_data.item.find_by_alias" as const;
export const MASTER_QUERY_ITEM_FIND_BY_EXTERNAL_ID =
	"master_data.item.find_by_external_id" as const;
export const MASTER_QUERY_PARTY_FIND_BY_EXTERNAL_ID =
	"master_data.party.find_by_external_id" as const;
export const MASTER_QUERY_WAREHOUSE_FIND_BY_EXTERNAL_ID =
	"master_data.warehouse.find_by_external_id" as const;
export const MASTER_QUERY_ITEM_TEMPLATE_GET_BY_ID =
	"master_data.item_template.get_by_id" as const;
export const MASTER_QUERY_ITEM_TEMPLATE_GET_BY_CODE =
	"master_data.item_template.get_by_code" as const;
export const MASTER_QUERY_ITEM_TEMPLATE_LIST =
	"master_data.item_template.list" as const;
export const MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_LIST =
	"master_data.item_template_attribute.list" as const;
export const MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_OPTION_LIST =
	"master_data.item_template_attribute_option.list" as const;
export const MASTER_QUERY_ITEM_VARIANT_GET_BY_ID =
	"master_data.item_variant.get_by_id" as const;
export const MASTER_QUERY_ITEM_VARIANT_LIST_BY_TEMPLATE =
	"master_data.item_variant.list_by_template" as const;
export const MASTER_QUERY_CHANGE_REQUEST_GET_BY_ID =
	"master_data.change_request.get_by_id" as const;
export const MASTER_QUERY_CHANGE_REQUEST_LIST =
	"master_data.change_request.list" as const;
export const MASTER_QUERY_REF_COUNTRY_GET_BY_CODE =
	"master_data.ref.country.get_by_code" as const;
export const MASTER_QUERY_REF_CURRENCY_GET_BY_CODE =
	"master_data.ref.currency.get_by_code" as const;
export const MASTER_QUERY_REF_LANGUAGE_GET_BY_CODE =
	"master_data.ref.language.get_by_code" as const;
export const MASTER_QUERY_REF_TIME_ZONE_GET_BY_IANA =
	"master_data.ref.time_zone.get_by_iana" as const;
export const MASTER_QUERY_REF_UOM_GET_BY_ID =
	"master_data.ref.uom.get_by_id" as const;
export const MASTER_QUERY_REF_UOM_GET_BY_CODE =
	"master_data.ref.uom.get_by_code" as const;
export const MASTER_QUERY_REF_UOM_LIST = "master_data.ref.uom.list" as const;
export const MASTER_QUERY_REF_UOM_DIMENSION_GET_BY_CODE =
	"master_data.ref.uom_dimension.get_by_code" as const;
export const MASTER_QUERY_SEARCH_QUERY = "master_data.search.query" as const;

export const MASTER_DATA_QUERY_IDS = [
	MASTER_QUERY_ORGANIZATION_DIMENSION_RESOLVE_AS_OF,
	MASTER_QUERY_PARTY_GET_BY_ID,
	MASTER_QUERY_PARTY_GET_BY_CODE,
	MASTER_QUERY_PARTY_LIST,
	MASTER_QUERY_PARTY_FIND_DUPLICATES,
	MASTER_QUERY_ITEM_GET_BY_ID,
	MASTER_QUERY_ITEM_GET_BY_CODE,
	MASTER_QUERY_ITEM_LIST,
	MASTER_QUERY_ITEM_GROUP_GET_BY_ID,
	MASTER_QUERY_ITEM_GROUP_GET_BY_CODE,
	MASTER_QUERY_ITEM_GROUP_LIST,
	MASTER_QUERY_WAREHOUSE_GET_BY_ID,
	MASTER_QUERY_WAREHOUSE_GET_BY_CODE,
	MASTER_QUERY_WAREHOUSE_LIST,
	MASTER_QUERY_PAYMENT_TERM_GET_BY_ID,
	MASTER_QUERY_PAYMENT_TERM_GET_BY_CODE,
	MASTER_QUERY_PAYMENT_TERM_LIST,
	MASTER_QUERY_TAX_REGISTRATION_GET_BY_ID,
	MASTER_QUERY_TAX_REGISTRATION_LIST,
	MASTER_QUERY_TAX_REGISTRATION_FIND_BY_PARTY,
	MASTER_QUERY_PARTY_ROLE_LIST,
	MASTER_QUERY_PARTY_ADDRESS_LIST,
	MASTER_QUERY_PARTY_CONTACT_LIST,
	MASTER_QUERY_ITEM_UOM_LIST,
	MASTER_QUERY_ITEM_FIND_BY_ALIAS,
	MASTER_QUERY_ITEM_FIND_BY_EXTERNAL_ID,
	MASTER_QUERY_PARTY_FIND_BY_EXTERNAL_ID,
	MASTER_QUERY_WAREHOUSE_FIND_BY_EXTERNAL_ID,
	MASTER_QUERY_ITEM_TEMPLATE_GET_BY_ID,
	MASTER_QUERY_ITEM_TEMPLATE_GET_BY_CODE,
	MASTER_QUERY_ITEM_TEMPLATE_LIST,
	MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_LIST,
	MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_OPTION_LIST,
	MASTER_QUERY_ITEM_VARIANT_GET_BY_ID,
	MASTER_QUERY_ITEM_VARIANT_LIST_BY_TEMPLATE,
	MASTER_QUERY_CHANGE_REQUEST_GET_BY_ID,
	MASTER_QUERY_CHANGE_REQUEST_LIST,
	MASTER_QUERY_REF_COUNTRY_GET_BY_CODE,
	MASTER_QUERY_REF_CURRENCY_GET_BY_CODE,
	MASTER_QUERY_REF_LANGUAGE_GET_BY_CODE,
	MASTER_QUERY_REF_TIME_ZONE_GET_BY_IANA,
	MASTER_QUERY_REF_UOM_GET_BY_ID,
	MASTER_QUERY_REF_UOM_GET_BY_CODE,
	MASTER_QUERY_REF_UOM_LIST,
	MASTER_QUERY_REF_UOM_DIMENSION_GET_BY_CODE,
	MASTER_QUERY_SEARCH_QUERY,
] as const;

export type MasterQueryId = (typeof MASTER_DATA_QUERY_IDS)[number];
