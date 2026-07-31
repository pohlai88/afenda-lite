import type { Result } from "@afenda/errors";
import type { MutationPorts } from "../../ports";
import type {
	ImportBatchStatus,
	ImportRowOperation,
} from "../data-governance-workflows/import-types";
import type {
	ItemExtensionStore,
	PartyExtensionStore,
	WarehouseExtensionStore,
} from "../extensions/store";
import type { ItemVariantExtensionStore } from "../extensions/template-store";
import type {
	ItemGroupLifecycleEventSuffix,
	ItemLifecycleEventSuffix,
	PartyLifecycleEventSuffix,
	PaymentTermLifecycleEventSuffix,
	TaxRegistrationLifecycleEventSuffix,
	WarehouseLifecycleEventSuffix,
} from "./core-master-events";
import type { OrganizationDimensionStore } from "./organization-dimension-store";

export interface ImportMutationContext {
	batchId: string;
	intendedOperation: Extract<ImportRowOperation, "create" | "update">;
	leaseOwner: string;
	matchedEntityId: string | null;
	organizationId: string;
	partyExternalIds?:
		| readonly {
				id: string;
				sourceSystem: string;
				externalIdType: string;
				externalValue: string;
				normalizedValue: string;
				caseSensitivity: "sensitive" | "insensitive";
				isPrimary: boolean;
				createdBy: string;
		  }[]
		| undefined;
	sourceRowNumber: number;
}

export interface MutationMeta {
	correlationId: string;
	/** Internal import execution context; the store commits the row result with the mutation. */
	importMutation?: ImportMutationContext | undefined;
}

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

export interface PartyCreateRecord {
	code: string;
	createdBy: string;
	defaultCurrencyId?: string | null | undefined;
	legalName?: string | null | undefined;
	name: string;
	normalizedCode: string;
	organizationId: string;
	partyKind: PartyKind;
	preferredLanguageId?: string | null | undefined;
	registrationCountryId?: string | null | undefined;
	registrationNumber?: string | null | undefined;
	tradingName?: string | null | undefined;
}

export interface PartyUpdateRecord {
	defaultCurrencyId?: string | null | undefined;
	expectedVersion: number;
	id: string;
	legalName?: string | null | undefined;
	name?: string | undefined;
	organizationId: string;
	preferredLanguageId?: string | null | undefined;
	registrationCountryId?: string | null | undefined;
	registrationNumber?: string | null | undefined;
	tradingName?: string | null | undefined;
	updatedBy: string;
}

export type PartyMergeFieldDecision = "source" | "target";

export interface PartyMergeRecord {
	actorUserId: string;
	/** Approved CR claimed → applied in same TX as merge. */
	changeRequestId: string;
	fieldDecisions: {
		name?: PartyMergeFieldDecision | undefined;
		legalName?: PartyMergeFieldDecision | undefined;
		tradingName?: PartyMergeFieldDecision | undefined;
		registrationNumber?: PartyMergeFieldDecision | undefined;
		registrationCountryId?: PartyMergeFieldDecision | undefined;
		preferredLanguageId?: PartyMergeFieldDecision | undefined;
		defaultCurrencyId?: PartyMergeFieldDecision | undefined;
	};
	organizationId: string;
	sourceExpectedVersion: number;
	sourcePartyId: string;
	targetExpectedVersion: number;
	targetPartyId: string;
}

export interface LifecycleRecord {
	actorUserId: string;
	/** When set (activate_party), claim approved CR → applied in same TX. */
	changeRequestId?: string;
	expectedVersion: number;
	id: string;
	organizationId: string;
	toStatus: MasterStatus;
}

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

export interface ChangeRequestCreateRecord {
	code: string;
	commandKind: ChangeRequestCommandKind;
	normalizedCode: string;
	organizationId: string;
	payload: ChangeRequestPayload;
	subjectEntityId: string;
	subjectEntityType: "party";
	submittedBy: string;
}

export interface ChangeRequestReviewRecord {
	actorUserId: string;
	expectedVersion: number;
	id: string;
	organizationId: string;
	reviewNote: string | null;
	toStatus: "approved" | "rejected";
}

export interface ChangeRequestListFilter {
	commandKind?: ChangeRequestCommandKind | undefined;
	organizationId: string;
	page: number;
	pageSize: number;
	status?: ChangeRequestStatus | undefined;
}

export interface ItemGroupCreateRecord {
	code: string;
	createdBy: string;
	name: string;
	normalizedCode: string;
	organizationId: string;
	parentId?: string | null | undefined;
}

export interface ItemGroupUpdateRecord {
	expectedVersion: number;
	id: string;
	name?: string | undefined;
	organizationId: string;
	parentId?: string | null | undefined;
	updatedBy: string;
}

export type ItemGroupLifecycleRecord = Omit<LifecycleRecord, "toStatus"> & {
	toStatus: "active" | "inactive" | "retired";
};

export interface ItemCreateRecord {
	baseUomId: string;
	code: string;
	createdBy: string;
	description?: string | null | undefined;
	itemGroupId: string;
	itemType: ItemType;
	name: string;
	normalizedCode: string;
	organizationId: string;
	purchasable?: boolean | undefined;
	sellable?: boolean | undefined;
	serviceIndicator?: boolean | undefined;
	stocked?: boolean | undefined;
	trackingPolicy?: ItemTrackingPolicy | undefined;
}

export interface ItemUpdateRecord {
	baseUomId?: string | undefined;
	description?: string | null | undefined;
	expectedVersion: number;
	id: string;
	itemGroupId?: string | undefined;
	itemType?: ItemType | undefined;
	name?: string | undefined;
	organizationId: string;
	purchasable?: boolean | undefined;
	sellable?: boolean | undefined;
	serviceIndicator?: boolean | undefined;
	stocked?: boolean | undefined;
	trackingPolicy?: ItemTrackingPolicy | undefined;
	updatedBy: string;
}

export type ItemLifecycleRecord = Omit<LifecycleRecord, "toStatus"> & {
	toStatus: "draft" | "active" | "inactive" | "retired";
};

export interface WarehouseCreateRecord {
	addressCity?: string | null | undefined;
	addressCountryId?: string | null | undefined;
	addressLine1?: string | null | undefined;
	addressLine2?: string | null | undefined;
	addressPostalCode?: string | null | undefined;
	addressRegion?: string | null | undefined;
	code: string;
	createdBy: string;
	locationType: WarehouseLocationType;
	name: string;
	normalizedCode: string;
	organizationId: string;
	parentId?: string | null | undefined;
}

export interface WarehouseUpdateRecord {
	addressCity?: string | null | undefined;
	addressCountryId?: string | null | undefined;
	addressLine1?: string | null | undefined;
	addressLine2?: string | null | undefined;
	addressPostalCode?: string | null | undefined;
	addressRegion?: string | null | undefined;
	expectedVersion: number;
	id: string;
	locationType?: WarehouseLocationType | undefined;
	name?: string | undefined;
	organizationId: string;
	updatedBy: string;
}

export interface WarehouseMoveRecord {
	expectedVersion: number;
	id: string;
	organizationId: string;
	parentId: string | null;
	updatedBy: string;
}

export type WarehouseLifecycleRecord = Omit<LifecycleRecord, "toStatus"> & {
	toStatus: "active" | "inactive" | "retired";
};

export interface PaymentTermCreateRecord {
	code: string;
	createdBy: string;
	currencyRestrictionId?: string | null | undefined;
	discountDays?: number | null | undefined;
	discountPercent?: string | null | undefined;
	dueDayRule?: PaymentTerm["dueDayRule"] | undefined;
	endOfMonth?: boolean | undefined;
	installmentCount?: number | null | undefined;
	installmentPolicy?: PaymentTerm["installmentPolicy"] | undefined;
	name: string;
	netDays: number;
	normalizedCode: string;
	organizationId: string;
	validFrom?: Date | null | undefined;
	validTo?: Date | null | undefined;
}

export interface PaymentTermUpdateRecord {
	currencyRestrictionId?: string | null | undefined;
	discountDays?: number | null | undefined;
	discountPercent?: string | null | undefined;
	dueDayRule?: PaymentTerm["dueDayRule"] | undefined;
	endOfMonth?: boolean | undefined;
	expectedVersion: number;
	id: string;
	installmentCount?: number | null | undefined;
	installmentPolicy?: PaymentTerm["installmentPolicy"] | undefined;
	name?: string | undefined;
	netDays?: number | undefined;
	organizationId: string;
	updatedBy: string;
	validFrom?: Date | null | undefined;
	validTo?: Date | null | undefined;
}

export type PaymentTermLifecycleRecord = Omit<LifecycleRecord, "toStatus"> & {
	toStatus: "active" | "inactive" | "retired";
};

export interface TaxRegistrationCreateRecord {
	createdBy: string;
	jurisdictionCountryId: string;
	name: string | null;
	normalizedRegistrationNumber: string;
	organizationId: string;
	partyId: string;
	registrationNumber: string;
	registrationType: TaxRegistrationType;
	validFrom: Date | null;
	validTo: Date | null;
}

export interface TaxRegistrationUpdateRecord {
	expectedVersion: number;
	id: string;
	name?: string | null | undefined;
	organizationId: string;
	updatedBy: string;
	validFrom?: Date | null | undefined;
	validTo?: Date | null | undefined;
}

export interface TaxRegistrationOverlapQuery {
	excludeId?: string;
	jurisdictionCountryId: string;
	organizationId: string;
	partyId: string;
	registrationType: TaxRegistrationType;
	validFrom: Date;
	validTo: Date | null;
}

export type TaxRegistrationLifecycleRecord = Omit<
	LifecycleRecord,
	"toStatus"
> & {
	toStatus: "active" | "blocked" | "retired";
};

export interface ListFilter {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: MasterStatus | undefined;
	updatedSince?: Date | undefined;
}

export type PartySearchFilter = ListFilter & {
	query: string;
};

export type PartyByRoleFilter = ListFilter & {
	roleCode: PartyRoleCode;
	activeOnly: boolean;
};

export interface PartyTaxRegistrationLookup {
	jurisdictionCountryId: string;
	normalizedRegistrationNumber: string;
	organizationId: string;
	registrationType: TaxRegistrationType;
}

export type TaxRegistrationListFilter = ListFilter & {
	partyId?: string | undefined;
};

export type ItemListFilter = ListFilter & {
	itemGroupId?: string | undefined;
};

/**
 * Read-only platform reference lookups used by ERP master-data validation.
 * Physical `ref_*` table definition and seeding remain outside this package.
 */
export interface ReferenceQueryStore {
	getRefCountryByCode: (code: string) => Promise<Result<RefCountry | null>>;
	getRefCountryById: (id: string) => Promise<Result<RefCountry | null>>;
	getRefCurrencyByCode: (code: string) => Promise<Result<RefCurrency | null>>;
	getRefCurrencyById: (id: string) => Promise<Result<RefCurrency | null>>;
	getRefLanguageByCode: (code: string) => Promise<Result<RefLanguage | null>>;
	getRefTimeZoneByIana: (
		ianaName: string,
	) => Promise<Result<RefTimeZone | null>>;
	getRefUomByCode: (code: string) => Promise<Result<RefUom | null>>;
	getRefUomById: (id: string) => Promise<Result<RefUom | null>>;
	getRefUomDimensionByCode: (
		code: string,
	) => Promise<Result<RefUomDimension | null>>;
	listRefUoms: () => Promise<Result<RefUom[]>>;
}

/** Persistence boundary required by the party aggregate. */
export interface PartyStore {
	createParty: (
		record: PartyCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Party>>;
	findPartyByTaxRegistration: (
		filter: PartyTaxRegistrationLookup,
	) => Promise<Result<Party | null>>;
	getPartyByCode: (
		organizationId: string,
		normalizedCode: string,
	) => Promise<Result<Party | null>>;
	getPartyById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Party | null>>;
	listParties: (filter: ListFilter) => Promise<Result<Party[]>>;
	listPartiesByRole: (filter: PartyByRoleFilter) => Promise<Result<Party[]>>;
	searchParties: (filter: PartySearchFilter) => Promise<Result<Party[]>>;
	transitionParty: (
		record: PartyLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PartyLifecycleEventSuffix;
		},
	) => Promise<Result<Party>>;
	updateParty: (
		record: PartyUpdateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Party>>;
}

/** Merge persistence stays named and domain-specific; no generic executor. */
export interface MergeStore {
	mergeParties: (
		record: PartyMergeRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<{ survivor: Party; merged: Party }>>;
}

/** Persistence boundary for governed change requests. */
export interface ChangeRequestStore {
	createChangeRequest: (
		record: ChangeRequestCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ChangeRequest>>;
	getChangeRequestById: (
		organizationId: string,
		id: string,
	) => Promise<Result<ChangeRequest | null>>;
	listChangeRequests: (
		filter: ChangeRequestListFilter,
	) => Promise<Result<ChangeRequest[]>>;
	transitionChangeRequest: (
		record: ChangeRequestReviewRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: "approved" | "rejected" },
	) => Promise<Result<ChangeRequest>>;
}

/** Persistence boundary required by the item-group aggregate. */
export interface ItemGroupStore {
	createItemGroup: (
		record: ItemGroupCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<ItemGroup>>;
	getItemGroupByCode: (
		organizationId: string,
		normalizedCode: string,
	) => Promise<Result<ItemGroup | null>>;
	getItemGroupById: (
		organizationId: string,
		id: string,
	) => Promise<Result<ItemGroup | null>>;
	listItemGroups: (filter: ListFilter) => Promise<Result<ItemGroup[]>>;
	transitionItemGroup: (
		record: ItemGroupLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: ItemGroupLifecycleEventSuffix;
		},
	) => Promise<Result<ItemGroup>>;
	updateItemGroup: (
		record: ItemGroupUpdateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<ItemGroup>>;
}

/** Persistence boundary required by the item aggregate. */
export interface ItemStore {
	createItem: (
		record: ItemCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Item>>;
	getItemByCode: (
		organizationId: string,
		normalizedCode: string,
	) => Promise<Result<Item | null>>;
	getItemById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Item | null>>;
	listItems: (filter: ItemListFilter) => Promise<Result<Item[]>>;
	transitionItem: (
		record: ItemLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: ItemLifecycleEventSuffix;
		},
	) => Promise<Result<Item>>;
	updateItem: (
		record: ItemUpdateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Item>>;
}

/** Persistence boundary required by the warehouse aggregate. */
export interface WarehouseStore {
	createWarehouse: (
		record: WarehouseCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Warehouse>>;
	getWarehouseByCode: (
		organizationId: string,
		normalizedCode: string,
	) => Promise<Result<Warehouse | null>>;
	getWarehouseById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Warehouse | null>>;
	listWarehouses: (filter: ListFilter) => Promise<Result<Warehouse[]>>;
	moveWarehouse: (
		record: WarehouseMoveRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<Warehouse>>;
	transitionWarehouse: (
		record: WarehouseLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: WarehouseLifecycleEventSuffix;
		},
	) => Promise<Result<Warehouse>>;
	updateWarehouse: (
		record: WarehouseUpdateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Warehouse>>;
}

/** Persistence boundary required by commercial masters. */
export interface CommercialMasterStore {
	createPaymentTerm: (
		record: PaymentTermCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PaymentTerm>>;
	createTaxRegistration: (
		record: TaxRegistrationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<TaxRegistration>>;
	findOverlappingActiveTaxRegistration: (
		query: TaxRegistrationOverlapQuery,
	) => Promise<Result<TaxRegistration | null>>;
	findTaxRegistrationsByParty: (
		organizationId: string,
		partyId: string,
	) => Promise<Result<TaxRegistration[]>>;
	getPaymentTermByCode: (
		organizationId: string,
		normalizedCode: string,
	) => Promise<Result<PaymentTerm | null>>;
	getPaymentTermById: (
		organizationId: string,
		id: string,
	) => Promise<Result<PaymentTerm | null>>;

	getTaxRegistrationById: (
		organizationId: string,
		id: string,
	) => Promise<Result<TaxRegistration | null>>;
	listPaymentTerms: (filter: ListFilter) => Promise<Result<PaymentTerm[]>>;
	listTaxRegistrations: (
		filter: TaxRegistrationListFilter,
	) => Promise<Result<TaxRegistration[]>>;
	transitionPaymentTerm: (
		record: PaymentTermLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PaymentTermLifecycleEventSuffix;
		},
	) => Promise<Result<PaymentTerm>>;
	transitionTaxRegistration: (
		record: TaxRegistrationLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: TaxRegistrationLifecycleEventSuffix;
		},
	) => Promise<Result<TaxRegistration>>;
	updatePaymentTerm: (
		record: PaymentTermUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PaymentTerm>>;
	updateTaxRegistration: (
		record: TaxRegistrationUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<TaxRegistration>>;
}

export type ItemTemplateStore = ItemVariantExtensionStore;

/** Persistence boundary for idempotent import batch replay evidence. */
export interface ImportBatchStore {
	acquireImportBatchLease: (
		record: ImportBatchLeaseRequest,
	) => Promise<Result<ImportBatchLeaseResult>>;
	claimImportBatch: (
		record: ImportBatchClaimRecord,
	) => Promise<Result<ImportBatchClaimResult>>;
	completeImportBatch: (
		record: ImportBatchCompletionRecord,
	) => Promise<Result<ImportBatchRecord>>;
	getImportBatchByIdempotencyKey: (
		organizationId: string,
		idempotencyKey: string,
	) => Promise<Result<ImportBatchRecord | null>>;
	listImportBatchRows: (
		organizationId: string,
		batchId: string,
	) => Promise<Result<ImportBatchRowRecord[]>>;
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

export interface ImportBatchRecord {
	actorUserId: string;
	completedAt: Date | null;
	correlationId: string;
	createdAt: Date;
	entityType: ImportBatchEntityType;
	id: string;
	idempotencyKey: string;
	leaseExpiresAt: Date | null;
	leaseOwner: string | null;
	mode: string;
	operationType: string;
	organizationId: string;
	payloadHash: string;
	report: unknown | null;
	sourceSystem: string;
	status: ImportBatchStatus;
	updatedAt: Date;
}

export type ImportBatchRowStatus =
	| "pending"
	| "applying"
	| "applied"
	| "failed"
	| "skipped";

export interface ImportBatchRowRecord {
	attemptCount: number;
	batchId: string;
	completedAt: Date | null;
	createdAt: Date;
	errorCode: string | null;
	errorDetails: Readonly<Record<string, unknown>> | null;
	id: string;
	intendedOperation: ImportRowOperation | null;
	leaseExpiresAt: Date | null;
	leaseOwner: string | null;
	matchedEntityId: string | null;
	normalizedPayload: Readonly<Record<string, unknown>>;
	organizationId: string;
	payloadHash: string;
	resultEntityId: string | null;
	resultVersion: number | null;
	sourceRowNumber: number;
	startedAt: Date | null;
	status: ImportBatchRowStatus;
	updatedAt: Date;
}

export interface ImportBatchRowClaimRecord {
	id: string;
	normalizedPayload: Readonly<Record<string, unknown>>;
	payloadHash: string;
	sourceRowNumber: number;
}

export interface ImportBatchClaimRecord {
	actorUserId: string;
	correlationId: string;
	entityType: ImportBatchEntityType;
	id: string;
	idempotencyKey: string;
	mode: string;
	operationType: string;
	organizationId: string;
	payloadHash: string;
	rows: readonly ImportBatchRowClaimRecord[];
	sourceSystem: string;
}

export type ImportBatchClaimResult =
	| { kind: "claimed"; batch: ImportBatchRecord }
	| { kind: "existing"; batch: ImportBatchRecord };

export interface ImportBatchLeaseRequest {
	batchId: string;
	leaseExpiresAt: Date;
	leaseOwner: string;
	organizationId: string;
}

export type ImportBatchLeaseResult =
	| { kind: "acquired"; batch: ImportBatchRecord }
	| { kind: "busy"; batch: ImportBatchRecord }
	| { kind: "completed"; batch: ImportBatchRecord };

export interface ImportBatchCompletionRecord {
	batchId: string;
	leaseOwner: string;
	organizationId: string;
	report: unknown;
	rows: readonly {
		sourceRowNumber: number;
		intendedOperation: ImportRowOperation;
		matchedEntityId: string | null;
		status: Exclude<ImportBatchRowStatus, "pending" | "applying">;
		errorCode: string | null;
		errorDetails: Readonly<Record<string, unknown>> | null;
		resultEntityId: string | null;
		resultVersion: number | null;
	}[];
	status: "partially_applied" | "applied" | "failed";
}
