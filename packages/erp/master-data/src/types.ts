export const MASTER_STATUSES = [
	"draft",
	"active",
	"inactive",
	"blocked",
	"retired",
] as const;

export type MasterStatus = (typeof MASTER_STATUSES)[number];

import type {
	ExtensionLifecycleStatus,
	IdentityRegistrationLifecycleStatus,
	RelationshipLifecycleStatus,
	StandardChildLifecycleStatus,
} from "./capabilities/extensions/extension-lifecycle";
import type { ItemAliasType } from "./capabilities/extensions/item-alias-policy";
import type { ItemBarcodeSymbology } from "./capabilities/extensions/item-barcode-policy";
import type { ItemUomCompatibilityMode } from "./capabilities/extensions/item-uom-policy";
import type {
	ItemTemplateAttributeDataType,
	ItemTemplateAttributeValidationRules,
} from "./capabilities/extensions/template-attribute-policy";
import {
	GOVERNANCE_WORKFLOW_STATES,
	type GovernanceWorkflowState,
} from "./capabilities/lifecycle-governance/types";

export const EXTENSION_STATUSES = [
	"draft",
	"pending",
	"active",
	"inactive",
	"expired",
	"revoked",
	"terminated",
	"archived",
] as const satisfies readonly ExtensionLifecycleStatus[];
export type ExtensionStatus = ExtensionLifecycleStatus;
export type {
	ExtensionLifecycleFamily,
	ExtensionLifecycleStatus,
	IdentityRegistrationLifecycleStatus,
	RelationshipLifecycleStatus,
	StandardChildLifecycleStatus,
} from "./capabilities/extensions/extension-lifecycle";
export {
	IDENTITY_REGISTRATION_LIFECYCLE_STATUSES,
	RELATIONSHIP_LIFECYCLE_STATUSES,
	STANDARD_CHILD_LIFECYCLE_STATUSES,
} from "./capabilities/extensions/extension-lifecycle";

type MutableExtensionRecord = {
	id: string;
	organizationId: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

type EffectiveDatedExtensionRecord = MutableExtensionRecord & {
	validFrom: Date | null;
	validTo: Date | null;
};

export const PARTY_KINDS = ["organization", "person"] as const;
export type PartyKind = (typeof PARTY_KINDS)[number];

export const ITEM_TYPES = [
	"stock",
	"non_stock",
	"service",
	"asset_candidate",
	"expense",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const WAREHOUSE_LOCATION_TYPES = [
	"site",
	"warehouse",
	"zone",
	"aisle",
	"rack",
	"bin",
] as const;
export type WarehouseLocationType = (typeof WAREHOUSE_LOCATION_TYPES)[number];

export {
	type RefCountry,
	type RefCurrency,
	type RefLanguage,
	type RefTimeZone,
	type RefUom,
	type RefUomDimension,
	UOM_DIMENSION_CODES,
	type UomDimensionCode,
} from "./capabilities/platform-references";

type OrgMasterBase = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	status: MasterStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	activatedAt: Date | null;
	activatedBy: string | null;
	retiredAt: Date | null;
	retiredBy: string | null;
	createdAt: Date;
	updatedAt: Date;
};

/** Unified party — roles live in md_party_role (closed catalog). */
export type Party = OrgMasterBase & {
	partyKind: PartyKind;
	legalName: string | null;
	tradingName: string | null;
	registrationNumber: string | null;
	registrationCountryId: string | null;
	preferredLanguageId: string | null;
	defaultCurrencyId: string | null;
	mergedIntoId: string | null;
	blockedAt: Date | null;
	blockedBy: string | null;
};

export type ItemGroup = OrgMasterBase & {
	parentId: string | null;
};

export type Item = OrgMasterBase & {
	itemType: ItemType;
	baseUomId: string;
	itemGroupId: string;
};

/** @deprecated Use `ITEM_TEMPLATE_ATTRIBUTE_DATA_TYPES`. */
export const ITEM_TEMPLATE_ATTRIBUTE_VALUE_KINDS = ["text", "option"] as const;
/** @deprecated Use `ItemTemplateAttributeDataType`. */
export type ItemTemplateAttributeValueKind =
	(typeof ITEM_TEMPLATE_ATTRIBUTE_VALUE_KINDS)[number];
export {
	ITEM_TEMPLATE_ATTRIBUTE_DATA_TYPES,
	type ItemTemplateAttributeDataType,
	type ItemTemplateAttributeValidationRules,
	OPTION_COMPATIBLE_ATTRIBUTE_DATA_TYPES,
} from "./capabilities/extensions/template-attribute-policy";

export type ItemTemplate = OrgMasterBase;

export type ItemTemplateAttribute = MutableExtensionRecord & {
	templateId: string;
	code: string;
	normalizedCode: string;
	name: string;
	description: string | null;
	dataType: ItemTemplateAttributeDataType;
	/** @deprecated Compatibility projection; use `dataType`. */
	valueKind: ItemTemplateAttributeValueKind;
	isRequired: boolean;
	isVariantDefining: boolean;
	isSearchable: boolean;
	displayOrder: number;
	/** @deprecated Compatibility alias; use `displayOrder`. */
	sortOrder: number;
	validationRules: ItemTemplateAttributeValidationRules;
	status: StandardChildLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export type ItemTemplateAttributeOption = MutableExtensionRecord & {
	attributeId: string;
	code: string;
	normalizedCode: string;
	label: string;
	description: string | null;
	displayOrder: number;
	/** @deprecated Compatibility alias; use `displayOrder`. */
	sortOrder: number;
	status: StandardChildLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export type ItemVariantAttributeValue = MutableExtensionRecord & {
	variantId: string;
	attributeId: string;
	valueType: ItemTemplateAttributeDataType;
	textValue: string | null;
	/** @deprecated Compatibility alias; use `textValue`. */
	valueText: string | null;
	integerValue: string | null;
	decimalValue: string | null;
	booleanValue: boolean | null;
	dateValue: string | null;
	optionId: string | null;
	optionIds: readonly string[];
	referenceValue: string | null;
	status: StandardChildLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

/** Concrete variant membership — sellable identity remains `md_item`. */
export type ItemVariant = MutableExtensionRecord & {
	itemId: string;
	templateId: string;
	combinationKey: string;
	retiredAt: Date | null;
	retiredBy: string | null;
	item: Item;
	values: ItemVariantAttributeValue[];
};

export type Warehouse = OrgMasterBase & {
	locationType: WarehouseLocationType;
	parentId: string | null;
};

export type PaymentTerm = OrgMasterBase & {
	/** Transactional documents persist their calculated due date and term snapshot. */
	netDays: number;
};

export const MAX_PAYMENT_TERM_NET_DAYS = 999;

export const TAX_REGISTRATION_TYPES = [
	"vat_gst",
	"tin",
	"ein_local",
	"other_gov",
] as const;
export type TaxRegistrationType = (typeof TAX_REGISTRATION_TYPES)[number];

/** Party-linked tax registration identity — no mnemonic `code` column. */
export type TaxRegistration = {
	id: string;
	organizationId: string;
	partyId: string;
	jurisdictionCountryId: string;
	registrationType: TaxRegistrationType;
	registrationNumber: string;
	normalizedRegistrationNumber: string;
	name: string | null;
	status: MasterStatus;
	version: number;
	validFrom: Date | null;
	validTo: Date | null;
	createdBy: string;
	updatedBy: string;
	activatedAt: Date | null;
	activatedBy: string | null;
	blockedAt: Date | null;
	blockedBy: string | null;
	retiredAt: Date | null;
	retiredBy: string | null;
	deletedAt: Date | null;
	deletedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type MasterDependency = {
	module: string;
	entityType: string;
	entityId: string;
	reason: string;
};

export type DependencyInspector = {
	listBlockers(input: {
		organizationId: string;
		entityType:
			| "party"
			| "item"
			| "item_group"
			| "item_template"
			| "warehouse"
			| "payment_term";
		entityId: string;
	}): Promise<MasterDependency[]>;
};

export const PARTY_ROLE_CODES = [
	"customer",
	"supplier",
	"employee",
	"carrier",
	"manufacturer",
	"agent",
	"distributor",
	"franchisee",
	"franchisor",
	"service_provider",
	"government_agency",
	"bank",
	"landlord",
	"tenant",
	"contact",
	"regulator",
	"other_authorized_role",
] as const;
export type PartyRoleCode = (typeof PARTY_ROLE_CODES)[number];

export const PARTY_ADDRESS_TYPES = [
	"physical",
	"postal",
	"registered",
	"billing",
	"shipping",
	"operational",
] as const;
export type PartyAddressType = (typeof PARTY_ADDRESS_TYPES)[number];

export const PARTY_ADDRESS_PURPOSES = [
	"registered",
	"billing",
	"shipping",
	"correspondence",
	"operational",
	"returns",
	"tax",
	"other",
] as const;
export type PartyAddressPurpose = (typeof PARTY_ADDRESS_PURPOSES)[number];

export const PARTY_ADDRESS_VALIDATION_STATUSES = [
	"unvalidated",
	"validated",
	"invalid",
] as const;
export type PartyAddressValidationStatus =
	(typeof PARTY_ADDRESS_VALIDATION_STATUSES)[number];

export const PARTY_CONTACT_TYPES = [
	"email",
	"telephone",
	"mobile",
	"fax",
	"website",
	"messaging",
	"other",
] as const;
export type PartyContactType = (typeof PARTY_CONTACT_TYPES)[number];

export const PARTY_CONTACT_VERIFICATION_STATUSES = [
	"unverified",
	"pending",
	"verified",
	"failed",
] as const;
export type PartyContactVerificationStatus =
	(typeof PARTY_CONTACT_VERIFICATION_STATUSES)[number];

/** Controlled party relationship types (Scratch §8). */
export const PARTY_RELATIONSHIP_TYPES = [
	"parent_of",
	"subsidiary_of",
	"owned_by",
	"contact_for",
	"bill_to_for",
	"ship_to_for",
	"supplies",
	"distributes_for",
	"franchisee_of",
	"related_party",
	"landlord_of",
	"tenant_of",
] as const;
export type PartyRelationshipType = (typeof PARTY_RELATIONSHIP_TYPES)[number];
export const PARTY_RELATIONSHIP_DIRECTIONS = [
	"directional",
	"reciprocal",
	"hierarchical",
	"symmetric",
] as const;
export type PartyRelationshipDirection =
	(typeof PARTY_RELATIONSHIP_DIRECTIONS)[number];

export type PartyRole = EffectiveDatedExtensionRecord & {
	partyId: string;
	roleCode: PartyRoleCode;
	status: StandardChildLifecycleStatus;
	activatedAt: Date | null;
	activatedBy: string | null;
	retiredAt: Date | null;
	retiredBy: string | null;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export type PartyAddress = MutableExtensionRecord & {
	partyId: string;
	addressType: PartyAddressType;
	purpose: PartyAddressPurpose;
	line1: string;
	line2: string | null;
	line3: string | null;
	city: string;
	administrativeArea: string | null;
	postalCode: string | null;
	countryId: string;
	attention: string | null;
	isPrimary: boolean;
	validationStatus: PartyAddressValidationStatus;
	effectiveFrom: Date | null;
	effectiveTo: Date | null;
	status: StandardChildLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export type PartyContact = MutableExtensionRecord & {
	partyId: string;
	contactType: PartyContactType;
	value: string;
	normalizedValue: string;
	label: string | null;
	purpose: string | null;
	isPrimary: boolean;
	verificationStatus: PartyContactVerificationStatus;
	verifiedAt: Date | null;
	effectiveFrom: Date | null;
	effectiveTo: Date | null;
	status: StandardChildLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export const EXTERNAL_ID_CASE_SENSITIVITIES = [
	"sensitive",
	"insensitive",
] as const;
export type ExternalIdCaseSensitivity =
	(typeof EXTERNAL_ID_CASE_SENSITIVITIES)[number];
/** @deprecated Use ExternalIdCaseSensitivity. */
export type PartyExternalIdCaseSensitivity = ExternalIdCaseSensitivity;
/** @deprecated Use EXTERNAL_ID_CASE_SENSITIVITIES. */
export const PARTY_EXTERNAL_ID_CASE_SENSITIVITIES =
	EXTERNAL_ID_CASE_SENSITIVITIES;

export type PartyExternalId = MutableExtensionRecord & {
	partyId: string;
	sourceSystem: string;
	externalIdType: string;
	externalValue: string;
	normalizedValue: string;
	caseSensitivity: PartyExternalIdCaseSensitivity;
	isPrimary: boolean;
	status: StandardChildLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export type PartyRelationship = MutableExtensionRecord & {
	sourcePartyId: string;
	targetPartyId: string;
	relationshipType: PartyRelationshipType;
	direction: PartyRelationshipDirection;
	effectiveFrom: Date | null;
	effectiveTo: Date | null;
	status: RelationshipLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export type ItemUom = EffectiveDatedExtensionRecord & {
	itemId: string;
	alternateUomId: string;
	conversionFactor: string;
	roundingScale: number;
	isPurchaseUom: boolean;
	isSalesUom: boolean;
	isInventoryUom: boolean;
	isDefaultPurchaseUom: boolean;
	isDefaultSalesUom: boolean;
	compatibilityMode: ItemUomCompatibilityMode;
	packagingApprovalReference: string | null;
	status: StandardChildLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export type ItemBarcode = MutableExtensionRecord & {
	itemId: string;
	barcodeValue: string;
	normalizedValue: string;
	symbology: ItemBarcodeSymbology;
	uomId: string | null;
	packQuantity: string | null;
	isPrimary: boolean;
	status: IdentityRegistrationLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export type ItemExternalId = MutableExtensionRecord & {
	itemId: string;
	sourceSystem: string;
	externalIdType: string;
	externalValue: string;
	normalizedValue: string;
	caseSensitivity: PartyExternalIdCaseSensitivity;
	isPrimary: boolean;
	status: StandardChildLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export type ItemAlias = MutableExtensionRecord & {
	itemId: string;
	aliasType: ItemAliasType;
	aliasValue: string;
	normalizedValue: string;
	languageId: string | null;
	source: string;
	isSearchable: boolean;
	status: StandardChildLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

export type WarehouseExternalId = MutableExtensionRecord & {
	warehouseId: string;
	sourceSystem: string;
	externalIdType: string;
	externalValue: string;
	normalizedValue: string;
	caseSensitivity: PartyExternalIdCaseSensitivity;
	status: StandardChildLifecycleStatus;
	archivedAt: Date | null;
	archivedBy: string | null;
};

/** MDG v1 gated command kinds (activate party + merge parties). */
export const CHANGE_REQUEST_COMMAND_KINDS = [
	"activate_party",
	"merge_parties",
] as const;
export type ChangeRequestCommandKind =
	(typeof CHANGE_REQUEST_COMMAND_KINDS)[number];

export const CHANGE_REQUEST_STATUSES = GOVERNANCE_WORKFLOW_STATES;
export type ChangeRequestStatus = GovernanceWorkflowState;

export type ActivatePartyChangePayload = {
	partyId: string;
};

export type MergePartiesChangePayload = {
	sourcePartyId: string;
	targetPartyId: string;
	fieldDecisions?: {
		name?: "source" | "target";
		legalName?: "source" | "target";
		tradingName?: "source" | "target";
		registrationNumber?: "source" | "target";
		registrationCountryId?: "source" | "target";
		preferredLanguageId?: "source" | "target";
		defaultCurrencyId?: "source" | "target";
	};
};

export type ChangeRequestPayload =
	| ActivatePartyChangePayload
	| MergePartiesChangePayload;

export type ChangeRequest = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	commandKind: ChangeRequestCommandKind;
	status: ChangeRequestStatus;
	version: number;
	payload: ChangeRequestPayload;
	subjectEntityType: "party";
	subjectEntityId: string;
	submittedBy: string;
	submittedAt: Date;
	reviewedBy: string | null;
	reviewedAt: Date | null;
	reviewNote: string | null;
	appliedBy: string | null;
	appliedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};
