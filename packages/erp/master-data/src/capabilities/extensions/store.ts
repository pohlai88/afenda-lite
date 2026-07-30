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

export interface PartyRoleLifecycleRecord {
	actorUserId: string;
	expectedVersion: number;
	id: string;
	organizationId: string;
	reason: string | null;
	toStatus: StandardChildLifecycleStatus;
}

export interface PartyRoleCreateRecord {
	createdBy: string;
	organizationId: string;
	partyId: string;
	roleCode: PartyRoleCode;
	validFrom?: Date | null | undefined;
	validTo?: Date | null | undefined;
}

export interface PartyRoleUpdateRecord {
	expectedVersion: number;
	id: string;
	organizationId: string;
	roleCode?: PartyRoleCode | undefined;
	updatedBy: string;
	validFrom?: Date | null | undefined;
	validTo?: Date | null | undefined;
}

export interface PartyRoleListFilter {
	organizationId: string;
	page: number;
	pageSize: number;
	partyId: string;
}

export interface PartyRoleLifecycleContext {
	activeRoleCount: number;
	party: Party | null;
	role: PartyRole | null;
}

export interface PartyAddressCreateRecord {
	addressType: PartyAddressType;
	administrativeArea?: string | null | undefined;
	attention?: string | null | undefined;
	city: string;
	countryId: string;
	createdBy: string;
	effectiveFrom?: Date | null | undefined;
	effectiveTo?: Date | null | undefined;
	isPrimary?: boolean | undefined;
	line1: string;
	line2?: string | null | undefined;
	line3?: string | null | undefined;
	organizationId: string;
	partyId: string;
	postalCode?: string | null | undefined;
	purpose: PartyAddressPurpose;
	validationStatus?: PartyAddressValidationStatus | undefined;
}

export interface PartyAddressUpdateRecord {
	addressType?: PartyAddressType | undefined;
	administrativeArea?: string | null | undefined;
	attention?: string | null | undefined;
	city?: string | undefined;
	countryId?: string | undefined;
	effectiveFrom?: Date | null | undefined;
	effectiveTo?: Date | null | undefined;
	expectedVersion: number;
	id: string;
	isPrimary?: boolean | undefined;
	line1?: string | undefined;
	line2?: string | null | undefined;
	line3?: string | null | undefined;
	organizationId: string;
	postalCode?: string | null | undefined;
	purpose?: PartyAddressPurpose | undefined;
	updatedBy: string;
	validationStatus?: PartyAddressValidationStatus | undefined;
}

export interface PartyContactCreateRecord {
	contactType: PartyContactType;
	createdBy: string;
	effectiveFrom?: Date | null | undefined;
	effectiveTo?: Date | null | undefined;
	isPrimary?: boolean | undefined;
	label?: string | null | undefined;
	normalizedValue: string;
	organizationId: string;
	partyId: string;
	purpose?: string | null | undefined;
	value: string;
}

export interface PartyContactUpdateRecord {
	contactType?: PartyContactType | undefined;
	effectiveFrom?: Date | null | undefined;
	effectiveTo?: Date | null | undefined;
	expectedVersion: number;
	id: string;
	isPrimary?: boolean | undefined;
	label?: string | null | undefined;
	normalizedValue?: string | undefined;
	organizationId: string;
	purpose?: string | null | undefined;
	updatedBy: string;
	value?: string | undefined;
	verificationStatus?: PartyContactVerificationStatus | undefined;
	verifiedAt?: Date | null | undefined;
}

export interface PartyContactVerificationRecord {
	expectedVersion: number;
	id: string;
	organizationId: string;
	updatedBy: string;
	verificationStatus: PartyContactVerificationStatus;
	verifiedAt: Date | null;
}

export interface PartyExternalIdCreateRecord {
	caseSensitivity: PartyExternalIdCaseSensitivity;
	createdBy: string;
	externalIdType: string;
	externalValue: string;
	isPrimary: boolean;
	normalizedValue: string;
	organizationId: string;
	partyId: string;
	sourceSystem: string;
}

export interface PartyExternalIdLookup {
	caseSensitivity: PartyExternalIdCaseSensitivity;
	externalIdType: string;
	normalizedValue: string;
	organizationId: string;
	sourceSystem: string;
}

export interface PartyRelationshipCreateRecord {
	createdBy: string;
	direction: PartyRelationshipDirection;
	effectiveFrom: Date | null;
	effectiveTo: Date | null;
	organizationId: string;
	relationshipType: PartyRelationshipType;
	sourcePartyId: string;
	targetPartyId: string;
}

export interface PartyRelationshipListFilter {
	organizationId: string;
	page: number;
	pageSize: number;
	partyId: string;
}

export interface ItemUomCreateRecord {
	alternateUomId: string;
	compatibilityMode: ItemUomCompatibilityMode;
	conversionFactor: string;
	createdBy: string;
	isDefaultPurchaseUom: boolean;
	isDefaultSalesUom: boolean;
	isInventoryUom: boolean;
	isPurchaseUom: boolean;
	isSalesUom: boolean;
	itemId: string;
	organizationId: string;
	packagingApprovalReference: string | null;
	roundingScale: number;
}

export interface ItemUomCompatibilityContextFilter {
	alternateUomId: string;
	itemId: string;
	organizationId: string;
}

export interface ItemUomCompatibilityContext {
	alternateDimensionCode: string;
	alternateUomId: string;
	baseDimensionCode: string;
	baseUomId: string;
	itemId: string;
}

export interface ItemUomListFilter {
	itemId: string;
	organizationId: string;
	page: number;
	pageSize: number;
}

export interface ItemUomDefaultFilter {
	itemId: string;
	organizationId: string;
}

export interface ItemBarcodeCreateRecord {
	barcodeValue: string;
	createdBy: string;
	isPrimary: boolean;
	itemId: string;
	normalizedValue: string;
	organizationId: string;
	packQuantity: string | null;
	symbology: ItemBarcodeSymbology;
	uomId: string | null;
}

export interface ItemBarcodeLookup {
	includeArchived: boolean;
	normalizedValue: string;
	organizationId: string;
	symbology: ItemBarcodeSymbology;
}

export interface ItemExternalIdCreateRecord {
	caseSensitivity: ExternalIdCaseSensitivity;
	createdBy: string;
	externalIdType: string;
	externalValue: string;
	isPrimary: boolean;
	itemId: string;
	normalizedValue: string;
	organizationId: string;
	sourceSystem: string;
}

export interface ItemExternalIdLookup {
	caseSensitivity: ExternalIdCaseSensitivity;
	externalIdType: string;
	normalizedValue: string;
	organizationId: string;
	sourceSystem: string;
}

export interface ItemAliasCreateRecord {
	aliasType: ItemAliasType;
	aliasValue: string;
	createdBy: string;
	isSearchable: boolean;
	itemId: string;
	languageId: string | null;
	normalizedValue: string;
	organizationId: string;
	source: string;
}

export interface ItemAliasLookup {
	aliasType?: ItemAliasType | undefined;
	/**
	 * undefined searches any language; null searches language-neutral aliases only.
	 */
	languageId?: string | null | undefined;
	normalizedValue: string;
	organizationId: string;
}

export interface ExtensionListPage<TItem> {
	hasNextPage: boolean;
	items: TItem[];
	page: number;
	pageSize: number;
}

export interface ItemAliasListFilter {
	itemId: string;
	organizationId: string;
	page: number;
	pageSize: number;
}

export type ItemAliasSearchFilter = ItemAliasLookup & {
	page: number;
	pageSize: number;
};

export interface WarehouseExternalIdCreateRecord {
	caseSensitivity: PartyExternalIdCaseSensitivity;
	createdBy: string;
	externalIdType: string;
	externalValue: string;
	normalizedValue: string;
	organizationId: string;
	sourceSystem: string;
	warehouseId: string;
}

export interface ParentListFilter {
	organizationId: string;
	page: number;
	pageSize: number;
	parentId: string;
}

/** Party-owned child persistence boundary. */
export interface PartyExtensionStore {
	countActivePartyRoles: (
		organizationId: string,
		partyId: string,
	) => Promise<Result<number>>;
	createPartyAddress: (
		record: PartyAddressCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PartyAddress>>;
	createPartyContact: (
		record: PartyContactCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PartyContact>>;

	createPartyExternalId: (
		record: PartyExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PartyExternalId>>;

	createPartyRelationship: (
		record: PartyRelationshipCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PartyRelationship>>;
	createPartyRole: (
		record: PartyRoleCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PartyRole>>;
	findPartyByExternalId: (
		filter: PartyExternalIdLookup,
	) => Promise<Result<Party | null>>;
	getPartyAddressById: (
		organizationId: string,
		partyId: string,
		id: string,
	) => Promise<Result<PartyAddress | null>>;
	getPartyRoleById: (
		organizationId: string,
		partyId: string,
		id: string,
	) => Promise<Result<PartyRole | null>>;
	getPartyRoleLifecycleContext: (
		organizationId: string,
		id: string,
	) => Promise<Result<PartyRoleLifecycleContext>>;
	getPrimaryPartyAddress: (
		organizationId: string,
		partyId: string,
		purpose: PartyAddressPurpose,
	) => Promise<Result<PartyAddress | null>>;
	getPrimaryPartyContact: (
		organizationId: string,
		partyId: string,
		contactType: PartyContactType,
		purpose: string | null,
	) => Promise<Result<PartyContact | null>>;
	listActivePartyRoles: (
		filter: PartyRoleListFilter,
	) => Promise<Result<ExtensionListPage<PartyRole>>>;

	listPartyAddresses: (
		filter: ParentListFilter,
	) => Promise<Result<PartyAddress[]>>;

	listPartyContacts: (
		filter: ParentListFilter,
	) => Promise<Result<PartyContact[]>>;
	listPartyRelationships: (
		filter: PartyRelationshipListFilter,
	) => Promise<Result<ExtensionListPage<PartyRelationship>>>;
	listPartyRoles: (
		filter: PartyRoleListFilter,
	) => Promise<Result<ExtensionListPage<PartyRole>>>;
	transitionPartyRole: (
		record: PartyRoleLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PartyRoleLifecycleEventSuffix;
		},
	) => Promise<Result<PartyRole>>;
	updatePartyAddress: (
		record: PartyAddressUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PartyAddress>>;
	updatePartyContact: (
		record: PartyContactUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PartyContact>>;
	updatePartyContactVerification: (
		record: PartyContactVerificationRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PartyContact>>;
	updatePartyRole: (
		record: PartyRoleUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PartyRole>>;
}

/** Item-owned child persistence boundary. */
export interface ItemExtensionStore {
	createItemAlias: (
		record: ItemAliasCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ItemAlias>>;

	createItemBarcode: (
		record: ItemBarcodeCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ItemBarcode>>;

	createItemExternalId: (
		record: ItemExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ItemExternalId>>;
	createItemUom: (
		record: ItemUomCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ItemUom>>;
	findItemByAlias: (filter: ItemAliasLookup) => Promise<Result<Item | null>>;
	findItemByBarcode: (
		filter: ItemBarcodeLookup,
	) => Promise<Result<Item | null>>;
	findItemByExternalId: (
		filter: ItemExternalIdLookup,
	) => Promise<Result<Item | null>>;
	getDefaultItemPurchaseUom: (
		filter: ItemUomDefaultFilter,
	) => Promise<Result<ItemUom | null>>;
	getDefaultItemSalesUom: (
		filter: ItemUomDefaultFilter,
	) => Promise<Result<ItemUom | null>>;
	listItemAliases: (
		filter: ItemAliasListFilter,
	) => Promise<Result<ExtensionListPage<ItemAlias>>>;
	listItemsByAlias: (
		filter: ItemAliasSearchFilter,
	) => Promise<Result<ExtensionListPage<Item>>>;
	listItemUoms: (
		filter: ItemUomListFilter,
	) => Promise<Result<ExtensionListPage<ItemUom>>>;
	resolveItemUomCompatibilityContext: (
		filter: ItemUomCompatibilityContextFilter,
	) => Promise<Result<ItemUomCompatibilityContext>>;
}

/** Warehouse-owned child persistence boundary. */
export interface WarehouseExtensionStore {
	createWarehouseExternalId: (
		record: WarehouseExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<WarehouseExternalId>>;
	findWarehouseByExternalId: (
		organizationId: string,
		sourceSystem: string,
		externalIdType: string,
		normalizedValue: string,
	) => Promise<Result<Warehouse | null>>;
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
