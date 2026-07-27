import type { Result } from "@afenda/errors/result";
import type { MutationPorts } from "../../ports";
import type {
	ItemExtensionStore,
	PartyExtensionStore,
	WarehouseExtensionStore,
} from "../extensions/store";
import type { ItemVariantExtensionStore } from "../extensions/template-store";
import type { GovernanceWorkflowState } from "../lifecycle-governance/types";
import type {
	ItemGroupLifecycleEventSuffix,
	ItemLifecycleEventSuffix,
	PartyLifecycleEventSuffix,
	PaymentTermLifecycleEventSuffix,
	TaxRegistrationLifecycleEventSuffix,
	WarehouseLifecycleEventSuffix,
} from "./core-master-events";
import type { OrganizationDimensionStore } from "./organization-dimension-store";

export type {
	ItemAliasCreateRecord,
	ItemBarcodeCreateRecord,
	ItemExternalIdCreateRecord,
	ItemUomCreateRecord,
	ParentListFilter,
	PartyAddressCreateRecord,
	PartyAddressUpdateRecord,
	PartyContactCreateRecord,
	PartyContactUpdateRecord,
	PartyExternalIdCreateRecord,
	PartyRelationshipCreateRecord,
	PartyRoleCreateRecord,
	WarehouseExternalIdCreateRecord,
} from "../extensions/store";
export type {
	ItemTemplateAttributeCreateRecord,
	ItemTemplateAttributeOptionCreateRecord,
	ItemTemplateCreateRecord,
	ItemTemplateLifecycleRecord,
	ItemTemplateUpdateRecord,
	ItemVariantAttributeValueCreateRecord,
	ItemVariantCreateRecord,
	ItemVariantExtensionStore,
	ItemVariantRetireRecord,
	ListItemVariantsFilter,
} from "../extensions/template-store";

import type {
	ChangeRequest,
	ChangeRequestCommandKind,
	ChangeRequestPayload,
	ChangeRequestStatus,
	Item,
	ItemGroup,
	ItemTrackingPolicy,
	ItemType,
	MasterStatus,
	Party,
	PartyKind,
	PartyRoleCode,
	PaymentTerm,
	RefCountry,
	RefCurrency,
	RefLanguage,
	RefTimeZone,
	RefUom,
	RefUomDimension,
	TaxRegistration,
	TaxRegistrationType,
	Warehouse,
	WarehouseLocationType,
} from "../../types";

export type PartyCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	partyKind: PartyKind;
	createdBy: string;
	legalName?: string | null;
	tradingName?: string | null;
	registrationNumber?: string | null;
	registrationCountryId?: string | null;
	preferredLanguageId?: string | null;
	defaultCurrencyId?: string | null;
};

export type PartyUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	name?: string;
	legalName?: string | null;
	tradingName?: string | null;
	registrationNumber?: string | null;
	registrationCountryId?: string | null;
	preferredLanguageId?: string | null;
	defaultCurrencyId?: string | null;
};

export type PartyMergeFieldDecision = "source" | "target";

export type PartyMergeRecord = {
	organizationId: string;
	sourcePartyId: string;
	targetPartyId: string;
	sourceExpectedVersion: number;
	targetExpectedVersion: number;
	actorUserId: string;
	/** Approved CR claimed → applied in same TX as merge. */
	changeRequestId: string;
	fieldDecisions: {
		name?: PartyMergeFieldDecision;
		legalName?: PartyMergeFieldDecision;
		tradingName?: PartyMergeFieldDecision;
		registrationNumber?: PartyMergeFieldDecision;
		registrationCountryId?: PartyMergeFieldDecision;
		preferredLanguageId?: PartyMergeFieldDecision;
		defaultCurrencyId?: PartyMergeFieldDecision;
	};
};

export type LifecycleRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	actorUserId: string;
	toStatus: MasterStatus;
	/** When set (activate_party), claim approved CR → applied in same TX. */
	changeRequestId?: string;
};

type PartyNonActivationStatus = Exclude<MasterStatus, "active">;

export type PartyLifecycleRecord =
	| (Omit<LifecycleRecord, "toStatus" | "changeRequestId"> & {
			toStatus: "active";
			changeRequestId: string;
			requireActiveRole: true;
	  })
	| (Omit<LifecycleRecord, "toStatus" | "changeRequestId"> & {
			toStatus: PartyNonActivationStatus;
			changeRequestId?: never;
			requireActiveRole?: never;
	  });

export type ChangeRequestCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	commandKind: ChangeRequestCommandKind;
	payload: ChangeRequestPayload;
	subjectEntityType: "party";
	subjectEntityId: string;
	submittedBy: string;
};

export type ChangeRequestReviewRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	actorUserId: string;
	toStatus: "approved" | "rejected";
	reviewNote: string | null;
};

export type ChangeRequestListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: ChangeRequestStatus;
	commandKind?: ChangeRequestCommandKind;
};

export type ItemGroupCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	createdBy: string;
	parentId?: string | null;
};

export type ItemGroupUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	name?: string;
	parentId?: string | null;
};

export type ItemGroupLifecycleRecord = Omit<LifecycleRecord, "toStatus"> & {
	toStatus: "active" | "inactive" | "retired";
};

export type ItemCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	description?: string | null;
	itemType: ItemType;
	baseUomId: string;
	itemGroupId: string;
	trackingPolicy?: ItemTrackingPolicy;
	sellable?: boolean;
	purchasable?: boolean;
	stocked?: boolean;
	serviceIndicator?: boolean;
	createdBy: string;
};

export type ItemUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	name?: string;
	description?: string | null;
	itemType?: ItemType;
	baseUomId?: string;
	itemGroupId?: string;
	trackingPolicy?: ItemTrackingPolicy;
	sellable?: boolean;
	purchasable?: boolean;
	stocked?: boolean;
	serviceIndicator?: boolean;
};

export type ItemLifecycleRecord = Omit<LifecycleRecord, "toStatus"> & {
	toStatus: "draft" | "active" | "inactive" | "retired";
};

export type WarehouseCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	locationType: WarehouseLocationType;
	createdBy: string;
	parentId?: string | null;
	addressCountryId?: string | null;
	addressLine1?: string | null;
	addressLine2?: string | null;
	addressCity?: string | null;
	addressRegion?: string | null;
	addressPostalCode?: string | null;
};

export type WarehouseUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	name?: string;
	locationType?: WarehouseLocationType;
	addressCountryId?: string | null;
	addressLine1?: string | null;
	addressLine2?: string | null;
	addressCity?: string | null;
	addressRegion?: string | null;
	addressPostalCode?: string | null;
};

export type WarehouseMoveRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	parentId: string | null;
};

export type WarehouseLifecycleRecord = Omit<LifecycleRecord, "toStatus"> & {
	toStatus: "active" | "inactive" | "retired";
};

export type PaymentTermCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	netDays: number;
	createdBy: string;
	discountDays?: number | null;
	discountPercent?: string | null;
	dueDayRule?: PaymentTerm["dueDayRule"];
	endOfMonth?: boolean;
	installmentPolicy?: PaymentTerm["installmentPolicy"];
	installmentCount?: number | null;
	validFrom?: Date | null;
	validTo?: Date | null;
	currencyRestrictionId?: string | null;
};

export type PaymentTermUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	name?: string;
	netDays?: number;
	discountDays?: number | null;
	discountPercent?: string | null;
	dueDayRule?: PaymentTerm["dueDayRule"];
	endOfMonth?: boolean;
	installmentPolicy?: PaymentTerm["installmentPolicy"];
	installmentCount?: number | null;
	validFrom?: Date | null;
	validTo?: Date | null;
	currencyRestrictionId?: string | null;
};

export type PaymentTermLifecycleRecord = Omit<LifecycleRecord, "toStatus"> & {
	toStatus: "active" | "inactive" | "retired";
};

export type TaxRegistrationCreateRecord = {
	organizationId: string;
	partyId: string;
	jurisdictionCountryId: string;
	registrationType: TaxRegistrationType;
	registrationNumber: string;
	normalizedRegistrationNumber: string;
	name: string | null;
	validFrom: Date | null;
	validTo: Date | null;
	createdBy: string;
};

export type TaxRegistrationUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	name?: string | null;
	validFrom?: Date | null;
	validTo?: Date | null;
};

export type TaxRegistrationOverlapQuery = {
	organizationId: string;
	partyId: string;
	jurisdictionCountryId: string;
	registrationType: TaxRegistrationType;
	validFrom: Date;
	validTo: Date | null;
	excludeId?: string;
};

export type TaxRegistrationLifecycleRecord = Omit<
	LifecycleRecord,
	"toStatus"
> & {
	toStatus: "active" | "blocked" | "retired";
};

export type ListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: MasterStatus;
	updatedSince?: Date;
};

export type PartySearchFilter = ListFilter & {
	query: string;
};

export type PartyByRoleFilter = ListFilter & {
	roleCode: PartyRoleCode;
	activeOnly: boolean;
};

export type PartyTaxRegistrationLookup = {
	organizationId: string;
	jurisdictionCountryId: string;
	registrationType: TaxRegistrationType;
	normalizedRegistrationNumber: string;
};

export type TaxRegistrationListFilter = ListFilter & {
	partyId?: string;
};

export type ItemListFilter = ListFilter & {
	itemGroupId?: string;
};

/**
 * Read-only platform reference lookups used by ERP master-data validation.
 * Physical `ref_*` table definition and seeding remain outside this package.
 */
export interface ReferenceQueryStore {
	getRefCountryByCode(code: string): Promise<Result<RefCountry | null>>;
	getRefCountryById(id: string): Promise<Result<RefCountry | null>>;
	getRefCurrencyByCode(code: string): Promise<Result<RefCurrency | null>>;
	getRefCurrencyById(id: string): Promise<Result<RefCurrency | null>>;
	getRefLanguageByCode(code: string): Promise<Result<RefLanguage | null>>;
	getRefTimeZoneByIana(ianaName: string): Promise<Result<RefTimeZone | null>>;
	getRefUomDimensionByCode(
		code: string,
	): Promise<Result<RefUomDimension | null>>;
	getRefUomById(id: string): Promise<Result<RefUom | null>>;
	getRefUomByCode(code: string): Promise<Result<RefUom | null>>;
	listRefUoms(): Promise<Result<RefUom[]>>;
}

/** Persistence boundary required by the party aggregate. */
export interface PartyStore {
	getPartyById(
		organizationId: string,
		id: string,
	): Promise<Result<Party | null>>;
	getPartyByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Party | null>>;
	listParties(filter: ListFilter): Promise<Result<Party[]>>;
	listPartiesByRole(filter: PartyByRoleFilter): Promise<Result<Party[]>>;
	findPartyByTaxRegistration(
		filter: PartyTaxRegistrationLookup,
	): Promise<Result<Party | null>>;
	searchParties(filter: PartySearchFilter): Promise<Result<Party[]>>;
	createParty(
		record: PartyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Party>>;
	updateParty(
		record: PartyUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Party>>;
	transitionParty(
		record: PartyLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PartyLifecycleEventSuffix;
		},
	): Promise<Result<Party>>;
}

/** Merge persistence stays named and domain-specific; no generic executor. */
export interface MergeStore {
	mergeParties(
		record: PartyMergeRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<{ survivor: Party; merged: Party }>>;
}

/** Persistence boundary for governed change requests. */
export interface ChangeRequestStore {
	getChangeRequestById(
		organizationId: string,
		id: string,
	): Promise<Result<ChangeRequest | null>>;
	listChangeRequests(
		filter: ChangeRequestListFilter,
	): Promise<Result<ChangeRequest[]>>;
	createChangeRequest(
		record: ChangeRequestCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ChangeRequest>>;
	transitionChangeRequest(
		record: ChangeRequestReviewRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: "approved" | "rejected" },
	): Promise<Result<ChangeRequest>>;
}

/** Persistence boundary required by the item-group aggregate. */
export interface ItemGroupStore {
	getItemGroupById(
		organizationId: string,
		id: string,
	): Promise<Result<ItemGroup | null>>;
	getItemGroupByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<ItemGroup | null>>;
	listItemGroups(filter: ListFilter): Promise<Result<ItemGroup[]>>;
	createItemGroup(
		record: ItemGroupCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemGroup>>;
	updateItemGroup(
		record: ItemGroupUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemGroup>>;
	transitionItemGroup(
		record: ItemGroupLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: ItemGroupLifecycleEventSuffix;
		},
	): Promise<Result<ItemGroup>>;
}

/** Persistence boundary required by the item aggregate. */
export interface ItemStore {
	getItemById(organizationId: string, id: string): Promise<Result<Item | null>>;
	getItemByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Item | null>>;
	listItems(filter: ItemListFilter): Promise<Result<Item[]>>;
	createItem(
		record: ItemCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Item>>;
	updateItem(
		record: ItemUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Item>>;
	transitionItem(
		record: ItemLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: ItemLifecycleEventSuffix;
		},
	): Promise<Result<Item>>;
}

/** Persistence boundary required by the warehouse aggregate. */
export interface WarehouseStore {
	getWarehouseById(
		organizationId: string,
		id: string,
	): Promise<Result<Warehouse | null>>;
	getWarehouseByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Warehouse | null>>;
	listWarehouses(filter: ListFilter): Promise<Result<Warehouse[]>>;
	createWarehouse(
		record: WarehouseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Warehouse>>;
	updateWarehouse(
		record: WarehouseUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Warehouse>>;
	moveWarehouse(
		record: WarehouseMoveRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Warehouse>>;
	transitionWarehouse(
		record: WarehouseLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: WarehouseLifecycleEventSuffix;
		},
	): Promise<Result<Warehouse>>;
}

/** Persistence boundary required by commercial masters. */
export interface CommercialMasterStore {
	getPaymentTermById(
		organizationId: string,
		id: string,
	): Promise<Result<PaymentTerm | null>>;
	getPaymentTermByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<PaymentTerm | null>>;
	listPaymentTerms(filter: ListFilter): Promise<Result<PaymentTerm[]>>;
	createPaymentTerm(
		record: PaymentTermCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PaymentTerm>>;
	updatePaymentTerm(
		record: PaymentTermUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PaymentTerm>>;
	transitionPaymentTerm(
		record: PaymentTermLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PaymentTermLifecycleEventSuffix;
		},
	): Promise<Result<PaymentTerm>>;

	getTaxRegistrationById(
		organizationId: string,
		id: string,
	): Promise<Result<TaxRegistration | null>>;
	listTaxRegistrations(
		filter: TaxRegistrationListFilter,
	): Promise<Result<TaxRegistration[]>>;
	findTaxRegistrationsByParty(
		organizationId: string,
		partyId: string,
	): Promise<Result<TaxRegistration[]>>;
	findOverlappingActiveTaxRegistration(
		query: TaxRegistrationOverlapQuery,
	): Promise<Result<TaxRegistration | null>>;
	createTaxRegistration(
		record: TaxRegistrationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TaxRegistration>>;
	updateTaxRegistration(
		record: TaxRegistrationUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TaxRegistration>>;
	transitionTaxRegistration(
		record: TaxRegistrationLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: TaxRegistrationLifecycleEventSuffix;
		},
	): Promise<Result<TaxRegistration>>;
}

export type ItemTemplateStore = ItemVariantExtensionStore;

/** Persistence boundary for idempotent import batch replay evidence. */
export interface ImportBatchStore {
	getImportBatchByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<ImportBatchRecord | null>>;
	saveImportBatch(
		record: ImportBatchCreateRecord,
	): Promise<Result<ImportBatchRecord>>;
}

/**
 * Persistence port for master-data, composed from coherent capability stores.
 * Production: `DrizzleMasterDataStore` via `@afenda/master-data/adapters/drizzle`
 * (resolve-store defaults internally). Vitest: MemoryMasterDataStore (helpers).
 *
 * Commands should continue to depend on the smallest needed slice through Pick
 * or one of the named capability stores above.
 */
export interface MasterDataStore
	extends ReferenceQueryStore,
		OrganizationDimensionStore,
		PartyStore,
		ItemGroupStore,
		ItemStore,
		WarehouseStore,
		CommercialMasterStore,
		ItemTemplateStore,
		ChangeRequestStore,
		ImportBatchStore,
		MergeStore,
		PartyExtensionStore,
		ItemExtensionStore,
		WarehouseExtensionStore {}

export type MasterDataStoreCapabilities =
	| ReferenceQueryStore
	| OrganizationDimensionStore
	| PartyStore
	| ItemGroupStore
	| ItemStore
	| WarehouseStore
	| CommercialMasterStore
	| ItemTemplateStore
	| ChangeRequestStore
	| ImportBatchStore
	| MergeStore
	| PartyExtensionStore
	| ItemExtensionStore
	| WarehouseExtensionStore;

export type ImportBatchEntityType =
	| "party"
	| "item"
	| "item_group"
	| "warehouse";

export type ImportBatchRecord = {
	id: string;
	organizationId: string;
	idempotencyKey: string;
	entityType: ImportBatchEntityType;
	sourceSystem: string;
	mode: string;
	status: GovernanceWorkflowState;
	report: unknown;
	actorUserId: string;
	correlationId: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ImportBatchCreateRecord = {
	organizationId: string;
	idempotencyKey: string;
	entityType: ImportBatchEntityType;
	sourceSystem: string;
	mode: string;
	report: unknown;
	actorUserId: string;
	correlationId: string;
};
