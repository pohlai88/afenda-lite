import {
	activateItem as activateItemInternal,
	archiveItem as archiveItemInternal,
	createItem as createItemInternal,
	inactiveItem as inactiveItemInternal,
	restoreItem as restoreItemInternal,
	retireItem as retireItemInternal,
	suspendItem as suspendItemInternal,
	updateItem as updateItemInternal,
} from "./capabilities/core-organization-masters/item";
import {
	activateItemGroup as activateItemGroupInternal,
	createItemGroup as createItemGroupInternal,
	inactiveItemGroup as inactiveItemGroupInternal,
	retireItemGroup as retireItemGroupInternal,
	updateItemGroup as updateItemGroupInternal,
} from "./capabilities/core-organization-masters/item-group";
import {
	activateItemTemplate as activateItemTemplateInternal,
	archiveItemTemplate as archiveItemTemplateInternal,
	createItemTemplate as createItemTemplateInternal,
	createItemVariant as createItemVariantInternal,
	getItemTemplateByCode as getItemTemplateByCodeInternal,
	getItemTemplateById as getItemTemplateByIdInternal,
	getItemVariantById as getItemVariantByIdInternal,
	getVariantConfiguration as getVariantConfigurationInternal,
	inactiveItemTemplate as inactiveItemTemplateInternal,
	listItemTemplateAttributeOptions as listItemTemplateAttributeOptionsInternal,
	listItemTemplateAttributes as listItemTemplateAttributesInternal,
	listItemTemplates as listItemTemplatesInternal,
	listItemVariantsByTemplate as listItemVariantsByTemplateInternal,
	listVariantAttributeValues as listVariantAttributeValuesInternal,
	retireItemTemplate as retireItemTemplateInternal,
	retireItemVariant as retireItemVariantInternal,
	updateItemTemplate as updateItemTemplateInternal,
} from "./capabilities/core-organization-masters/item-template-variant";
import {
	activateOrganizationDimension as activateOrganizationDimensionInternal,
	archiveOrganizationDimension as archiveOrganizationDimensionInternal,
	createOrganizationDimension as createOrganizationDimensionInternal,
	deactivateOrganizationDimension as deactivateOrganizationDimensionInternal,
	getOrganizationDimensionByCode as getOrganizationDimensionByCodeInternal,
	getOrganizationDimensionById as getOrganizationDimensionByIdInternal,
	getOrganizationDimensionEffective as getOrganizationDimensionEffectiveInternal,
	listOrganizationDimensions as listOrganizationDimensionsInternal,
	resolveOrganizationDimensionsAsOf as resolveOrganizationDimensionsAsOfInternal,
	updateOrganizationDimension as updateOrganizationDimensionInternal,
} from "./capabilities/core-organization-masters/organization-dimension";
import type { OrganizationDimensionOptions } from "./capabilities/core-organization-masters/organization-dimension-store";
import {
	activateParty as activatePartyInternal,
	archiveParty as archivePartyInternal,
	blockParty as blockPartyInternal,
	createParty as createPartyInternal,
	inactiveParty as inactivePartyInternal,
	restoreParty as restorePartyInternal,
	retireParty as retirePartyInternal,
	suspendParty as suspendPartyInternal,
	updateParty as updatePartyInternal,
} from "./capabilities/core-organization-masters/party";
import {
	activatePaymentTerm as activatePaymentTermInternal,
	createPaymentTerm as createPaymentTermInternal,
	inactivePaymentTerm as inactivePaymentTermInternal,
	retirePaymentTerm as retirePaymentTermInternal,
	updatePaymentTerm as updatePaymentTermInternal,
} from "./capabilities/core-organization-masters/payment-term";
import {
	activateTaxRegistration as activateTaxRegistrationInternal,
	archiveTaxRegistration as archiveTaxRegistrationInternal,
	blockTaxRegistration as blockTaxRegistrationInternal,
	createTaxRegistration as createTaxRegistrationInternal,
	restoreTaxRegistration as restoreTaxRegistrationInternal,
	retireTaxRegistration as retireTaxRegistrationInternal,
	revokeTaxRegistration as revokeTaxRegistrationInternal,
	updateTaxRegistration as updateTaxRegistrationInternal,
} from "./capabilities/core-organization-masters/tax-registration";
import {
	activateWarehouse as activateWarehouseInternal,
	archiveWarehouse as archiveWarehouseInternal,
	createWarehouse as createWarehouseInternal,
	inactiveWarehouse as inactiveWarehouseInternal,
	moveWarehouse as moveWarehouseInternal,
	retireWarehouse as retireWarehouseInternal,
	suspendWarehouse as suspendWarehouseInternal,
	updateWarehouse as updateWarehouseInternal,
} from "./capabilities/core-organization-masters/warehouse";
import {
	approveChangeRequest as approveChangeRequestInternal,
	assertApprovedChangeRequestForApply as assertApprovedChangeRequestForApplyInternal,
	getChangeRequestById as getChangeRequestByIdInternal,
	listChangeRequests as listChangeRequestsInternal,
	rejectChangeRequest as rejectChangeRequestInternal,
	submitChangeRequest as submitChangeRequestInternal,
} from "./capabilities/data-governance-workflows/change-request-commands";
import {
	upsertItemGroupsByCode as upsertItemGroupsByCodeInternal,
	upsertItemsByCode as upsertItemsByCodeInternal,
	upsertPartiesByCode as upsertPartiesByCodeInternal,
	upsertWarehousesByCode as upsertWarehousesByCodeInternal,
	validatePartyImportBatch as validatePartyImportBatchInternal,
} from "./capabilities/data-governance-workflows/import-bulk-commands";
import {
	findPartyDuplicateWarnings as findPartyDuplicateWarningsInternal,
	mergeParties as mergePartiesInternal,
	resolveCanonicalPartyId as resolveCanonicalPartyIdInternal,
} from "./capabilities/data-governance-workflows/merge-commands";
import {
	createItemAlias as createItemAliasInternal,
	findItemByAlias as findItemByAliasInternal,
	listItemAliases as listItemAliasesInternal,
	listItemsByAlias as listItemsByAliasInternal,
} from "./capabilities/extensions/item-aliases";
import {
	createItemBarcode as createItemBarcodeInternal,
	findItemByBarcode as findItemByBarcodeInternal,
} from "./capabilities/extensions/item-barcodes";
import {
	createItemExternalId as createItemExternalIdInternal,
	findItemByExternalId as findItemByExternalIdInternal,
} from "./capabilities/extensions/item-external-ids";
import {
	createItemUom as createItemUomInternal,
	getDefaultItemPurchaseUom as getDefaultItemPurchaseUomInternal,
	getDefaultItemSalesUom as getDefaultItemSalesUomInternal,
	listItemUoms as listItemUomsInternal,
} from "./capabilities/extensions/item-uoms";
import {
	createPartyAddress as createPartyAddressInternal,
	getPartyAddressById as getPartyAddressByIdInternal,
	getPrimaryPartyAddress as getPrimaryPartyAddressInternal,
	listPartyAddresses as listPartyAddressesInternal,
	updatePartyAddress as updatePartyAddressInternal,
} from "./capabilities/extensions/party-addresses";
import {
	createPartyContact as createPartyContactInternal,
	getPrimaryPartyContact as getPrimaryPartyContactInternal,
	getSensitivePrimaryPartyContact as getSensitivePrimaryPartyContactInternal,
	listPartyContacts as listPartyContactsInternal,
	listSensitivePartyContacts as listSensitivePartyContactsInternal,
	updatePartyContact as updatePartyContactInternal,
	updatePartyContactVerification as updatePartyContactVerificationInternal,
} from "./capabilities/extensions/party-contacts";
import {
	createPartyExternalId as createPartyExternalIdInternal,
	findPartyByExternalId as findPartyByExternalIdInternal,
} from "./capabilities/extensions/party-external-ids";
import {
	createPartyRelationship as createPartyRelationshipInternal,
	listPartyRelationships as listPartyRelationshipsInternal,
} from "./capabilities/extensions/party-relationships";
import {
	activatePartyRole as activatePartyRoleInternal,
	archivePartyRole as archivePartyRoleInternal,
	createPartyRole as createPartyRoleInternal,
	deactivatePartyRole as deactivatePartyRoleInternal,
	getPartyRoleById as getPartyRoleByIdInternal,
	listActivePartyRoles as listActivePartyRolesInternal,
	listPartyRoles as listPartyRolesInternal,
	retirePartyRole as retirePartyRoleInternal,
	updatePartyRole as updatePartyRoleInternal,
} from "./capabilities/extensions/party-roles";
import { addItemTemplateAttribute as addItemTemplateAttributeInternal } from "./capabilities/extensions/template-attributes";
import { addItemTemplateAttributeOption as addItemTemplateAttributeOptionInternal } from "./capabilities/extensions/template-options";
import {
	createWarehouseExternalId as createWarehouseExternalIdInternal,
	findWarehouseByExternalId as findWarehouseByExternalIdInternal,
} from "./capabilities/extensions/warehouse-external-ids";
import {
	rebuildMasterDataSearchIndex as rebuildMasterDataSearchIndexInternal,
	searchMasterDataDocuments as searchMasterDataDocumentsInternal,
} from "./capabilities/integration-projections/search-projector-commands";
import {
	definePublicMasterDataCapability,
	definePublicMasterDataQuery,
	type PublicMasterDataCapability,
} from "./command-options";

function definePublicOrganizationDimensionCapability<TInput, TResult>(
	capability: (
		input: TInput,
		options?: OrganizationDimensionOptions,
	) => TResult,
): PublicMasterDataCapability<TInput, TResult> {
	return (input, options) => capability(input, options);
}

/**
 * Permanent root facade. Internal execution dependencies remain available only
 * to package-owned modules and adapter tests; consumers receive authorization only.
 */
export const activateItem =
	definePublicMasterDataCapability(activateItemInternal);
export const archiveItem =
	definePublicMasterDataCapability(archiveItemInternal);
export const createItem = definePublicMasterDataCapability(createItemInternal);
export const inactiveItem =
	definePublicMasterDataCapability(inactiveItemInternal);
export const restoreItem =
	definePublicMasterDataCapability(restoreItemInternal);
export const retireItem = definePublicMasterDataCapability(retireItemInternal);
export const suspendItem =
	definePublicMasterDataCapability(suspendItemInternal);
export const updateItem = definePublicMasterDataCapability(updateItemInternal);

export const activateItemGroup = definePublicMasterDataCapability(
	activateItemGroupInternal,
);
export const createItemGroup = definePublicMasterDataCapability(
	createItemGroupInternal,
);
export const inactiveItemGroup = definePublicMasterDataCapability(
	inactiveItemGroupInternal,
);
export const retireItemGroup = definePublicMasterDataCapability(
	retireItemGroupInternal,
);
export const updateItemGroup = definePublicMasterDataCapability(
	updateItemGroupInternal,
);

export const activateItemTemplate = definePublicMasterDataCapability(
	activateItemTemplateInternal,
);
export const archiveItemTemplate = definePublicMasterDataCapability(
	archiveItemTemplateInternal,
);
export const createItemTemplate = definePublicMasterDataCapability(
	createItemTemplateInternal,
);
export const createItemVariant = definePublicMasterDataCapability(
	createItemVariantInternal,
);
export const getItemTemplateByCode = definePublicMasterDataCapability(
	getItemTemplateByCodeInternal,
);
export const getItemTemplateById = definePublicMasterDataCapability(
	getItemTemplateByIdInternal,
);
export const getItemVariantById = definePublicMasterDataCapability(
	getItemVariantByIdInternal,
);
export const inactiveItemTemplate = definePublicMasterDataCapability(
	inactiveItemTemplateInternal,
);
export const listItemTemplates = definePublicMasterDataCapability(
	listItemTemplatesInternal,
);
export const listItemVariantsByTemplate = definePublicMasterDataCapability(
	listItemVariantsByTemplateInternal,
);
export const retireItemTemplate = definePublicMasterDataCapability(
	retireItemTemplateInternal,
);
export const retireItemVariant = definePublicMasterDataCapability(
	retireItemVariantInternal,
);
export const updateItemTemplate = definePublicMasterDataCapability(
	updateItemTemplateInternal,
);
export const getVariantConfiguration = definePublicMasterDataQuery(
	getVariantConfigurationInternal,
);
export const listItemTemplateAttributeOptions = definePublicMasterDataQuery(
	listItemTemplateAttributeOptionsInternal,
);
export const listItemTemplateAttributes = definePublicMasterDataQuery(
	listItemTemplateAttributesInternal,
);
export const listVariantAttributeValues = definePublicMasterDataQuery(
	listVariantAttributeValuesInternal,
);

export const activateOrganizationDimension =
	definePublicOrganizationDimensionCapability(
		activateOrganizationDimensionInternal,
	);
export const archiveOrganizationDimension =
	definePublicOrganizationDimensionCapability(
		archiveOrganizationDimensionInternal,
	);
export const createOrganizationDimension =
	definePublicOrganizationDimensionCapability(
		createOrganizationDimensionInternal,
	);
export const deactivateOrganizationDimension =
	definePublicOrganizationDimensionCapability(
		deactivateOrganizationDimensionInternal,
	);
export const getOrganizationDimensionByCode =
	definePublicOrganizationDimensionCapability(
		getOrganizationDimensionByCodeInternal,
	);
export const getOrganizationDimensionById =
	definePublicOrganizationDimensionCapability(
		getOrganizationDimensionByIdInternal,
	);
export const getOrganizationDimensionEffective =
	definePublicOrganizationDimensionCapability(
		getOrganizationDimensionEffectiveInternal,
	);
export const listOrganizationDimensions =
	definePublicOrganizationDimensionCapability(
		listOrganizationDimensionsInternal,
	);
export const resolveOrganizationDimensionsAsOf =
	definePublicOrganizationDimensionCapability(
		resolveOrganizationDimensionsAsOfInternal,
	);
export const updateOrganizationDimension =
	definePublicOrganizationDimensionCapability(
		updateOrganizationDimensionInternal,
	);

export const activateParty = definePublicMasterDataCapability(
	activatePartyInternal,
);
export const archiveParty =
	definePublicMasterDataCapability(archivePartyInternal);
export const blockParty = definePublicMasterDataCapability(blockPartyInternal);
export const createParty =
	definePublicMasterDataCapability(createPartyInternal);
export const inactiveParty = definePublicMasterDataCapability(
	inactivePartyInternal,
);
export const restoreParty =
	definePublicMasterDataCapability(restorePartyInternal);
export const retireParty =
	definePublicMasterDataCapability(retirePartyInternal);
export const suspendParty =
	definePublicMasterDataCapability(suspendPartyInternal);
export const updateParty =
	definePublicMasterDataCapability(updatePartyInternal);

export const activatePaymentTerm = definePublicMasterDataCapability(
	activatePaymentTermInternal,
);
export const createPaymentTerm = definePublicMasterDataCapability(
	createPaymentTermInternal,
);
export const inactivePaymentTerm = definePublicMasterDataCapability(
	inactivePaymentTermInternal,
);
export const retirePaymentTerm = definePublicMasterDataCapability(
	retirePaymentTermInternal,
);
export const updatePaymentTerm = definePublicMasterDataCapability(
	updatePaymentTermInternal,
);

export const activateTaxRegistration = definePublicMasterDataCapability(
	activateTaxRegistrationInternal,
);
export const archiveTaxRegistration = definePublicMasterDataCapability(
	archiveTaxRegistrationInternal,
);
export const blockTaxRegistration = definePublicMasterDataCapability(
	blockTaxRegistrationInternal,
);
export const createTaxRegistration = definePublicMasterDataCapability(
	createTaxRegistrationInternal,
);
export const restoreTaxRegistration = definePublicMasterDataCapability(
	restoreTaxRegistrationInternal,
);
export const retireTaxRegistration = definePublicMasterDataCapability(
	retireTaxRegistrationInternal,
);
export const revokeTaxRegistration = definePublicMasterDataCapability(
	revokeTaxRegistrationInternal,
);
export const updateTaxRegistration = definePublicMasterDataCapability(
	updateTaxRegistrationInternal,
);

export const activateWarehouse = definePublicMasterDataCapability(
	activateWarehouseInternal,
);
export const archiveWarehouse = definePublicMasterDataCapability(
	archiveWarehouseInternal,
);
export const createWarehouse = definePublicMasterDataCapability(
	createWarehouseInternal,
);
export const inactiveWarehouse = definePublicMasterDataCapability(
	inactiveWarehouseInternal,
);
export const moveWarehouse = definePublicMasterDataCapability(
	moveWarehouseInternal,
);
export const retireWarehouse = definePublicMasterDataCapability(
	retireWarehouseInternal,
);
export const suspendWarehouse = definePublicMasterDataCapability(
	suspendWarehouseInternal,
);
export const updateWarehouse = definePublicMasterDataCapability(
	updateWarehouseInternal,
);

export const approveChangeRequest = definePublicMasterDataCapability(
	approveChangeRequestInternal,
);
export const assertApprovedChangeRequestForApply =
	definePublicMasterDataCapability(assertApprovedChangeRequestForApplyInternal);
export const getChangeRequestById = definePublicMasterDataCapability(
	getChangeRequestByIdInternal,
);
export const listChangeRequests = definePublicMasterDataCapability(
	listChangeRequestsInternal,
);
export const rejectChangeRequest = definePublicMasterDataCapability(
	rejectChangeRequestInternal,
);
export const submitChangeRequest = definePublicMasterDataCapability(
	submitChangeRequestInternal,
);

export const upsertItemGroupsByCode = definePublicMasterDataCapability(
	upsertItemGroupsByCodeInternal,
);
export const upsertItemsByCode = definePublicMasterDataCapability(
	upsertItemsByCodeInternal,
);
export const upsertPartiesByCode = definePublicMasterDataCapability(
	upsertPartiesByCodeInternal,
);
export const upsertWarehousesByCode = definePublicMasterDataCapability(
	upsertWarehousesByCodeInternal,
);
export const validatePartyImportBatch = definePublicMasterDataCapability(
	validatePartyImportBatchInternal,
);

export const findPartyDuplicateWarnings = definePublicMasterDataCapability(
	findPartyDuplicateWarningsInternal,
);
export const mergeParties =
	definePublicMasterDataCapability(mergePartiesInternal);
export const resolveCanonicalPartyId = definePublicMasterDataCapability(
	resolveCanonicalPartyIdInternal,
);

export const createItemAlias = definePublicMasterDataCapability(
	createItemAliasInternal,
);
export const findItemByAlias = definePublicMasterDataQuery(
	findItemByAliasInternal,
);
export const listItemAliases = definePublicMasterDataQuery(
	listItemAliasesInternal,
);
export const listItemsByAlias = definePublicMasterDataQuery(
	listItemsByAliasInternal,
);

export const createItemBarcode = definePublicMasterDataCapability(
	createItemBarcodeInternal,
);
export const findItemByBarcode = definePublicMasterDataCapability(
	findItemByBarcodeInternal,
);

export const createItemExternalId = definePublicMasterDataCapability(
	createItemExternalIdInternal,
);
export const findItemByExternalId = definePublicMasterDataCapability(
	findItemByExternalIdInternal,
);

export const createItemUom = definePublicMasterDataCapability(
	createItemUomInternal,
);
export const getDefaultItemPurchaseUom = definePublicMasterDataCapability(
	getDefaultItemPurchaseUomInternal,
);
export const getDefaultItemSalesUom = definePublicMasterDataCapability(
	getDefaultItemSalesUomInternal,
);
export const listItemUoms =
	definePublicMasterDataCapability(listItemUomsInternal);

export const createPartyAddress = definePublicMasterDataCapability(
	createPartyAddressInternal,
);
export const getPartyAddressById = definePublicMasterDataCapability(
	getPartyAddressByIdInternal,
);
export const getPrimaryPartyAddress = definePublicMasterDataCapability(
	getPrimaryPartyAddressInternal,
);
export const listPartyAddresses = definePublicMasterDataCapability(
	listPartyAddressesInternal,
);
export const updatePartyAddress = definePublicMasterDataCapability(
	updatePartyAddressInternal,
);

export const createPartyContact = definePublicMasterDataCapability(
	createPartyContactInternal,
);
export const getPrimaryPartyContact = definePublicMasterDataCapability(
	getPrimaryPartyContactInternal,
);
export const getSensitivePrimaryPartyContact = definePublicMasterDataCapability(
	getSensitivePrimaryPartyContactInternal,
);
export const listPartyContacts = definePublicMasterDataCapability(
	listPartyContactsInternal,
);
export const listSensitivePartyContacts = definePublicMasterDataCapability(
	listSensitivePartyContactsInternal,
);
export const updatePartyContact = definePublicMasterDataCapability(
	updatePartyContactInternal,
);
export const updatePartyContactVerification = definePublicMasterDataCapability(
	updatePartyContactVerificationInternal,
);

export const createPartyExternalId = definePublicMasterDataCapability(
	createPartyExternalIdInternal,
);
export const findPartyByExternalId = definePublicMasterDataQuery(
	findPartyByExternalIdInternal,
);

export const createPartyRelationship = definePublicMasterDataCapability(
	createPartyRelationshipInternal,
);
export const listPartyRelationships = definePublicMasterDataQuery(
	listPartyRelationshipsInternal,
);

export const activatePartyRole = definePublicMasterDataCapability(
	activatePartyRoleInternal,
);
export const archivePartyRole = definePublicMasterDataCapability(
	archivePartyRoleInternal,
);
export const createPartyRole = definePublicMasterDataCapability(
	createPartyRoleInternal,
);
export const deactivatePartyRole = definePublicMasterDataCapability(
	deactivatePartyRoleInternal,
);
export const getPartyRoleById = definePublicMasterDataQuery(
	getPartyRoleByIdInternal,
);
export const listActivePartyRoles = definePublicMasterDataQuery(
	listActivePartyRolesInternal,
);
export const listPartyRoles = definePublicMasterDataQuery(
	listPartyRolesInternal,
);
export const retirePartyRole = definePublicMasterDataCapability(
	retirePartyRoleInternal,
);
export const updatePartyRole = definePublicMasterDataCapability(
	updatePartyRoleInternal,
);

export const addItemTemplateAttribute = definePublicMasterDataCapability(
	addItemTemplateAttributeInternal,
);

export const addItemTemplateAttributeOption = definePublicMasterDataCapability(
	addItemTemplateAttributeOptionInternal,
);

export const createWarehouseExternalId = definePublicMasterDataCapability(
	createWarehouseExternalIdInternal,
);
export const findWarehouseByExternalId = definePublicMasterDataQuery(
	findWarehouseByExternalIdInternal,
);

export const rebuildMasterDataSearchIndex = definePublicMasterDataCapability(
	rebuildMasterDataSearchIndexInternal,
);
export const searchMasterDataDocuments = definePublicMasterDataCapability(
	searchMasterDataDocumentsInternal,
);
