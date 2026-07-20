export const MASTER_STATUSES = [
	"draft",
	"active",
	"inactive",
	"blocked",
	"retired",
] as const;

export type MasterStatus = (typeof MASTER_STATUSES)[number];

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

export const UOM_DIMENSION_CODES = [
	"count",
	"mass",
	"volume",
	"length",
	"area",
	"time",
] as const;
export type UomDimensionCode = (typeof UOM_DIMENSION_CODES)[number];

export type RefCountry = {
	id: string;
	code: string;
	alpha3: string;
	name: string;
	active: boolean;
};

export type RefCurrency = {
	id: string;
	code: string;
	name: string;
	minorUnits: number;
	active: boolean;
};

export type RefLanguage = {
	id: string;
	code: string;
	name: string;
	active: boolean;
};

export type RefTimeZone = {
	id: string;
	ianaName: string;
	name: string;
	active: boolean;
};

export type RefUomDimension = {
	id: string;
	code: UomDimensionCode;
	name: string;
};

export type RefUom = {
	id: string;
	code: string;
	name: string;
	symbol: string;
	dimensionId: string;
	toBaseNumerator: string;
	toBaseDenominator: string;
	isBase: boolean;
	active: boolean;
};

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

/** Template attribute value kinds — typed columns only (no JSON bag). */
export const ITEM_TEMPLATE_ATTRIBUTE_VALUE_KINDS = ["text", "option"] as const;
export type ItemTemplateAttributeValueKind =
	(typeof ITEM_TEMPLATE_ATTRIBUTE_VALUE_KINDS)[number];

export type ItemTemplate = OrgMasterBase;

export type ItemTemplateAttribute = {
	id: string;
	organizationId: string;
	templateId: string;
	code: string;
	normalizedCode: string;
	name: string;
	valueKind: ItemTemplateAttributeValueKind;
	isRequired: boolean;
	sortOrder: number;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ItemTemplateAttributeOption = {
	id: string;
	organizationId: string;
	attributeId: string;
	code: string;
	normalizedCode: string;
	label: string;
	sortOrder: number;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ItemVariantAttributeValue = {
	id: string;
	organizationId: string;
	variantId: string;
	attributeId: string;
	valueText: string | null;
	optionId: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

/** Concrete variant membership — sellable identity remains `md_item`. */
export type ItemVariant = {
	id: string;
	organizationId: string;
	itemId: string;
	templateId: string;
	combinationKey: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	retiredAt: Date | null;
	retiredBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	item: Item;
	values: ItemVariantAttributeValue[];
};

export type Warehouse = OrgMasterBase & {
	locationType: WarehouseLocationType;
	parentId: string | null;
};

export type PaymentTerm = OrgMasterBase & {
	netDays: number;
};

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
		entityType: "party" | "item" | "item_group" | "warehouse" | "payment_term";
		entityId: string;
	}): Promise<MasterDependency[]>;
};

export const PARTY_ROLE_CODES = [
	"customer",
	"supplier",
	"carrier",
	"manufacturer",
	"agent",
	"distributor",
	"franchisee",
	"landlord",
	"bank",
	"regulator",
	"other_authorized_role",
] as const;
export type PartyRoleCode = (typeof PARTY_ROLE_CODES)[number];

export const ITEM_UOM_USAGES = [
	"purchase",
	"sales",
	"packaging",
	"other",
] as const;
export type ItemUomUsage = (typeof ITEM_UOM_USAGES)[number];

export type PartyRole = {
	id: string;
	organizationId: string;
	partyId: string;
	roleCode: PartyRoleCode;
	status: MasterStatus;
	version: number;
	validFrom: Date | null;
	validTo: Date | null;
	createdBy: string;
	updatedBy: string;
	activatedAt: Date | null;
	activatedBy: string | null;
	retiredAt: Date | null;
	retiredBy: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type PartyAddress = {
	id: string;
	organizationId: string;
	partyId: string;
	addressType: string;
	line1: string;
	line2: string | null;
	city: string;
	region: string | null;
	postalCode: string | null;
	countryId: string;
	isDefault: boolean;
	verificationStatus: string;
	version: number;
	validFrom: Date | null;
	validTo: Date | null;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PartyContact = {
	id: string;
	organizationId: string;
	partyId: string;
	contactType: string;
	value: string;
	purpose: string | null;
	isPrimary: boolean;
	verificationStatus: string;
	version: number;
	validFrom: Date | null;
	validTo: Date | null;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PartyExternalId = {
	id: string;
	organizationId: string;
	partyId: string;
	system: string;
	namespace: string;
	externalId: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PartyRelationship = {
	id: string;
	organizationId: string;
	fromPartyId: string;
	toPartyId: string;
	relationshipType: string;
	status: string;
	version: number;
	validFrom: Date | null;
	validTo: Date | null;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ItemUom = {
	id: string;
	organizationId: string;
	itemId: string;
	uomId: string;
	toBaseNumerator: string;
	toBaseDenominator: string;
	usage: ItemUomUsage;
	barcode: string | null;
	roundingRule: string | null;
	minQuantity: string | null;
	version: number;
	validFrom: Date | null;
	validTo: Date | null;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ItemBarcode = {
	id: string;
	organizationId: string;
	itemId: string;
	barcode: string;
	barcodeType: string;
	isPrimary: boolean;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ItemExternalId = {
	id: string;
	organizationId: string;
	itemId: string;
	system: string;
	namespace: string;
	externalId: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ItemAlias = {
	id: string;
	organizationId: string;
	itemId: string;
	aliasCode: string;
	normalizedAlias: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	retiredAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type WarehouseExternalId = {
	id: string;
	organizationId: string;
	warehouseId: string;
	system: string;
	namespace: string;
	externalId: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

/** MDG v1 gated command kinds (activate party + merge parties). */
export const CHANGE_REQUEST_COMMAND_KINDS = [
	"activate_party",
	"merge_parties",
] as const;
export type ChangeRequestCommandKind =
	(typeof CHANGE_REQUEST_COMMAND_KINDS)[number];

export const CHANGE_REQUEST_STATUSES = [
	"submitted",
	"approved",
	"rejected",
	"applied",
] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

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
