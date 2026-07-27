/**
 * Query naming:
 * - get: retrieve one record within a known aggregate context
 * - find: resolve a root through an alternate or business identifier
 * - list: retrieve an ordered collection
 */

// Item aliases
export {
	findItemByAlias,
	listItemAliases,
	listItemsByAlias,
} from "./item-aliases";

// Item identifiers
export { findItemByBarcode } from "./item-barcodes";
export { findItemByExternalId } from "./item-external-ids";

// Item units of measure
export {
	getDefaultItemPurchaseUom,
	getDefaultItemSalesUom,
	listItemUoms,
} from "./item-uoms";
// Party addresses
export {
	getPartyAddressById,
	getPrimaryPartyAddress,
	listPartyAddresses,
} from "./party-addresses";
// Party contacts
export {
	getPrimaryPartyContact,
	listPartyContacts,
} from "./party-contacts";
// Party identity and relationships
export { findPartyByExternalId } from "./party-external-ids";
export { listPartyRelationships } from "./party-relationships";
// Party roles
export {
	getPartyRole,
	getPartyRoleById,
	listActivePartyRoles,
	listPartyRoles,
} from "./party-roles";
// Item template and variant extension queries
export {
	listItemTemplateAttributes,
	listTemplateAttributes,
} from "./template-attributes";
export {
	listItemTemplateAttributeOptions,
	listTemplateAttributeOptions,
} from "./template-options";
export {
	getVariantConfiguration,
	listVariantAttributeValues,
} from "./variant-attribute-values";

// Warehouse identifiers
export { findWarehouseByExternalId } from "./warehouse-external-ids";
