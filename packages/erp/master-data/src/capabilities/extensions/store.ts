import type { Result } from "@afenda/errors/result";
import type { MutationPorts } from "../../ports";
import type {
	ExternalIdCaseSensitivity,
	Item,
	ItemAlias,
	ItemBarcode,
	ItemExternalId,
	ItemUom,
	Party,
	PartyAddress,
	PartyAddressPurpose,
	PartyAddressType,
	PartyAddressValidationStatus,
	PartyContact,
	PartyContactType,
	PartyContactVerificationStatus,
	PartyExternalId,
	PartyExternalIdCaseSensitivity,
	PartyRelationship,
	PartyRelationshipDirection,
	PartyRelationshipType,
	PartyRole,
	PartyRoleCode,
	Warehouse,
	WarehouseExternalId,
} from "../../types";
import type { StandardChildLifecycleStatus } from "./extension-lifecycle";
import type { PartyRoleLifecycleEventSuffix } from "./extension-transaction-contract";
import type { ItemAliasType } from "./item-alias-policy";
import type { ItemBarcodeSymbology } from "./item-barcode-policy";
import type { ItemUomCompatibilityMode } from "./item-uom-policy";

export type PartyRoleLifecycleRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	actorUserId: string;
	toStatus: StandardChildLifecycleStatus;
	reason: string | null;
};

export type PartyRoleCreateRecord = {
	organizationId: string;
	partyId: string;
	roleCode: PartyRoleCode;
	createdBy: string;
	validFrom?: Date | null | undefined;
	validTo?: Date | null | undefined;
};

export type PartyRoleUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	roleCode?: PartyRoleCode | undefined;
	validFrom?: Date | null | undefined;
	validTo?: Date | null | undefined;
};

export type PartyRoleListFilter = {
	organizationId: string;
	partyId: string;
	page: number;
	pageSize: number;
};

export type PartyRoleLifecycleContext = {
	role: PartyRole | null;
	party: Party | null;
	activeRoleCount: number;
};

export type PartyAddressCreateRecord = {
	organizationId: string;
	partyId: string;
	addressType: PartyAddressType;
	purpose: PartyAddressPurpose;
	line1: string;
	line2?: string | null | undefined;
	line3?: string | null | undefined;
	city: string;
	administrativeArea?: string | null | undefined;
	postalCode?: string | null | undefined;
	countryId: string;
	attention?: string | null | undefined;
	isPrimary?: boolean | undefined;
	validationStatus?: PartyAddressValidationStatus | undefined;
	effectiveFrom?: Date | null | undefined;
	effectiveTo?: Date | null | undefined;
	createdBy: string;
};

export type PartyAddressUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	addressType?: PartyAddressType | undefined;
	purpose?: PartyAddressPurpose | undefined;
	line1?: string | undefined;
	line2?: string | null | undefined;
	line3?: string | null | undefined;
	city?: string | undefined;
	administrativeArea?: string | null | undefined;
	postalCode?: string | null | undefined;
	countryId?: string | undefined;
	attention?: string | null | undefined;
	isPrimary?: boolean | undefined;
	validationStatus?: PartyAddressValidationStatus | undefined;
	effectiveFrom?: Date | null | undefined;
	effectiveTo?: Date | null | undefined;
};

export type PartyContactCreateRecord = {
	organizationId: string;
	partyId: string;
	contactType: PartyContactType;
	value: string;
	normalizedValue: string;
	label?: string | null | undefined;
	purpose?: string | null | undefined;
	isPrimary?: boolean | undefined;
	effectiveFrom?: Date | null | undefined;
	effectiveTo?: Date | null | undefined;
	createdBy: string;
};

export type PartyContactUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	contactType?: PartyContactType | undefined;
	value?: string | undefined;
	normalizedValue?: string | undefined;
	label?: string | null | undefined;
	purpose?: string | null | undefined;
	isPrimary?: boolean | undefined;
	effectiveFrom?: Date | null | undefined;
	effectiveTo?: Date | null | undefined;
	verificationStatus?: PartyContactVerificationStatus | undefined;
	verifiedAt?: Date | null | undefined;
};

export type PartyContactVerificationRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	verificationStatus: PartyContactVerificationStatus;
	verifiedAt: Date | null;
};

export type PartyExternalIdCreateRecord = {
	organizationId: string;
	partyId: string;
	sourceSystem: string;
	externalIdType: string;
	externalValue: string;
	normalizedValue: string;
	caseSensitivity: PartyExternalIdCaseSensitivity;
	isPrimary: boolean;
	createdBy: string;
};

export type PartyExternalIdLookup = {
	organizationId: string;
	sourceSystem: string;
	externalIdType: string;
	normalizedValue: string;
	caseSensitivity: PartyExternalIdCaseSensitivity;
};

export type PartyRelationshipCreateRecord = {
	organizationId: string;
	sourcePartyId: string;
	targetPartyId: string;
	relationshipType: PartyRelationshipType;
	direction: PartyRelationshipDirection;
	effectiveFrom: Date | null;
	effectiveTo: Date | null;
	createdBy: string;
};

export type PartyRelationshipListFilter = {
	organizationId: string;
	partyId: string;
	page: number;
	pageSize: number;
};

export type ItemUomCreateRecord = {
	organizationId: string;
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
	createdBy: string;
};

export type ItemUomCompatibilityContextFilter = {
	organizationId: string;
	itemId: string;
	alternateUomId: string;
};

export type ItemUomCompatibilityContext = {
	itemId: string;
	baseUomId: string;
	alternateUomId: string;
	baseDimensionCode: string;
	alternateDimensionCode: string;
};

export type ItemUomListFilter = {
	organizationId: string;
	itemId: string;
	page: number;
	pageSize: number;
};

export type ItemUomDefaultFilter = {
	organizationId: string;
	itemId: string;
};

export type ItemBarcodeCreateRecord = {
	organizationId: string;
	itemId: string;
	barcodeValue: string;
	normalizedValue: string;
	symbology: ItemBarcodeSymbology;
	uomId: string | null;
	packQuantity: string | null;
	isPrimary: boolean;
	createdBy: string;
};

export type ItemBarcodeLookup = {
	organizationId: string;
	symbology: ItemBarcodeSymbology;
	normalizedValue: string;
	includeArchived: boolean;
};

export type ItemExternalIdCreateRecord = {
	organizationId: string;
	itemId: string;
	sourceSystem: string;
	externalIdType: string;
	externalValue: string;
	normalizedValue: string;
	caseSensitivity: ExternalIdCaseSensitivity;
	isPrimary: boolean;
	createdBy: string;
};

export type ItemExternalIdLookup = {
	organizationId: string;
	sourceSystem: string;
	externalIdType: string;
	normalizedValue: string;
	caseSensitivity: ExternalIdCaseSensitivity;
};

export type ItemAliasCreateRecord = {
	organizationId: string;
	itemId: string;
	aliasType: ItemAliasType;
	aliasValue: string;
	normalizedValue: string;
	languageId: string | null;
	source: string;
	isSearchable: boolean;
	createdBy: string;
};

export type ItemAliasLookup = {
	organizationId: string;
	normalizedValue: string;
	aliasType?: ItemAliasType | undefined;
	/**
	 * undefined searches any language; null searches language-neutral aliases only.
	 */
	languageId?: string | null | undefined;
};

export type ExtensionListPage<TItem> = {
	items: TItem[];
	page: number;
	pageSize: number;
	hasNextPage: boolean;
};

export type ItemAliasListFilter = {
	organizationId: string;
	itemId: string;
	page: number;
	pageSize: number;
};

export type ItemAliasSearchFilter = ItemAliasLookup & {
	page: number;
	pageSize: number;
};

export type WarehouseExternalIdCreateRecord = {
	organizationId: string;
	warehouseId: string;
	sourceSystem: string;
	externalIdType: string;
	externalValue: string;
	normalizedValue: string;
	caseSensitivity: PartyExternalIdCaseSensitivity;
	createdBy: string;
};

export type ParentListFilter = {
	organizationId: string;
	parentId: string;
	page: number;
	pageSize: number;
};

/** Party-owned child persistence boundary. */
export interface PartyExtensionStore {
	countActivePartyRoles(
		organizationId: string,
		partyId: string,
	): Promise<Result<number>>;
	listPartyRoles(
		filter: PartyRoleListFilter,
	): Promise<Result<ExtensionListPage<PartyRole>>>;
	listActivePartyRoles(
		filter: PartyRoleListFilter,
	): Promise<Result<ExtensionListPage<PartyRole>>>;
	getPartyRoleById(
		organizationId: string,
		partyId: string,
		id: string,
	): Promise<Result<PartyRole | null>>;
	getPartyRoleLifecycleContext(
		organizationId: string,
		id: string,
	): Promise<Result<PartyRoleLifecycleContext>>;
	createPartyRole(
		record: PartyRoleCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyRole>>;
	updatePartyRole(
		record: PartyRoleUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyRole>>;
	transitionPartyRole(
		record: PartyRoleLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PartyRoleLifecycleEventSuffix;
		},
	): Promise<Result<PartyRole>>;

	listPartyAddresses(filter: ParentListFilter): Promise<Result<PartyAddress[]>>;
	getPartyAddressById(
		organizationId: string,
		partyId: string,
		id: string,
	): Promise<Result<PartyAddress | null>>;
	getPrimaryPartyAddress(
		organizationId: string,
		partyId: string,
		purpose: PartyAddressPurpose,
	): Promise<Result<PartyAddress | null>>;
	createPartyAddress(
		record: PartyAddressCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyAddress>>;
	updatePartyAddress(
		record: PartyAddressUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyAddress>>;

	listPartyContacts(filter: ParentListFilter): Promise<Result<PartyContact[]>>;
	getPrimaryPartyContact(
		organizationId: string,
		partyId: string,
		contactType: PartyContactType,
		purpose: string | null,
	): Promise<Result<PartyContact | null>>;
	createPartyContact(
		record: PartyContactCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyContact>>;
	updatePartyContact(
		record: PartyContactUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyContact>>;
	updatePartyContactVerification(
		record: PartyContactVerificationRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyContact>>;

	createPartyExternalId(
		record: PartyExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyExternalId>>;
	findPartyByExternalId(
		filter: PartyExternalIdLookup,
	): Promise<Result<Party | null>>;

	createPartyRelationship(
		record: PartyRelationshipCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyRelationship>>;
	listPartyRelationships(
		filter: PartyRelationshipListFilter,
	): Promise<Result<ExtensionListPage<PartyRelationship>>>;
}

/** Item-owned child persistence boundary. */
export interface ItemExtensionStore {
	resolveItemUomCompatibilityContext(
		filter: ItemUomCompatibilityContextFilter,
	): Promise<Result<ItemUomCompatibilityContext>>;
	createItemUom(
		record: ItemUomCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemUom>>;
	listItemUoms(
		filter: ItemUomListFilter,
	): Promise<Result<ExtensionListPage<ItemUom>>>;
	getDefaultItemSalesUom(
		filter: ItemUomDefaultFilter,
	): Promise<Result<ItemUom | null>>;
	getDefaultItemPurchaseUom(
		filter: ItemUomDefaultFilter,
	): Promise<Result<ItemUom | null>>;

	createItemBarcode(
		record: ItemBarcodeCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemBarcode>>;
	findItemByBarcode(filter: ItemBarcodeLookup): Promise<Result<Item | null>>;

	createItemExternalId(
		record: ItemExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemExternalId>>;
	findItemByExternalId(
		filter: ItemExternalIdLookup,
	): Promise<Result<Item | null>>;

	createItemAlias(
		record: ItemAliasCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemAlias>>;
	listItemAliases(
		filter: ItemAliasListFilter,
	): Promise<Result<ExtensionListPage<ItemAlias>>>;
	findItemByAlias(filter: ItemAliasLookup): Promise<Result<Item | null>>;
	listItemsByAlias(
		filter: ItemAliasSearchFilter,
	): Promise<Result<ExtensionListPage<Item>>>;
}

/** Warehouse-owned child persistence boundary. */
export interface WarehouseExtensionStore {
	createWarehouseExternalId(
		record: WarehouseExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WarehouseExternalId>>;
	findWarehouseByExternalId(
		organizationId: string,
		sourceSystem: string,
		externalIdType: string,
		normalizedValue: string,
	): Promise<Result<Warehouse | null>>;
}

/** Package-level composition of non-variant extension stores. */
export type MasterDataExtensionStore = PartyExtensionStore &
	ItemExtensionStore &
	WarehouseExtensionStore;

/** Smallest persistence capability consumed by one command or query. */
export type ExtensionStoreCapability<Store, Key extends keyof Store> = Pick<
	Store,
	Key
>;
