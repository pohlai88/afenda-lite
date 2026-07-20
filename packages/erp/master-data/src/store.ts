import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type { MasterDataExtensionStore } from "./store-extension-records";
import type { MasterDataVariantStore } from "./store-variant-records";

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
} from "./store-extension-records";
export type {
	ItemTemplateAttributeCreateRecord,
	ItemTemplateAttributeOptionCreateRecord,
	ItemTemplateCreateRecord,
	ItemTemplateUpdateRecord,
	ItemVariantAttributeValueCreateRecord,
	ItemVariantCreateRecord,
	ListItemVariantsFilter,
	MasterDataVariantStore,
} from "./store-variant-records";

import type {
	ChangeRequest,
	ChangeRequestCommandKind,
	ChangeRequestPayload,
	ChangeRequestStatus,
	Item,
	ItemGroup,
	ItemType,
	MasterStatus,
	Party,
	PartyKind,
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
} from "./types";

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

export type ItemCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	itemType: ItemType;
	baseUomId: string;
	itemGroupId: string;
	createdBy: string;
};

export type ItemUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	name?: string;
	itemType?: ItemType;
	baseUomId?: string;
	itemGroupId?: string;
};

export type WarehouseCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	locationType: WarehouseLocationType;
	createdBy: string;
	parentId?: string | null;
};

export type WarehouseUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	name?: string;
	locationType?: WarehouseLocationType;
};

export type WarehouseMoveRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	parentId: string | null;
};

export type PaymentTermCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	netDays: number;
	createdBy: string;
};

export type PaymentTermUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	name?: string;
	netDays?: number;
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

export type ListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: MasterStatus;
};

export type TaxRegistrationListFilter = ListFilter & {
	partyId?: string;
};

/**
 * Persistence port for master-data. Production: DrizzleMasterDataStore.
 * Vitest: MemoryMasterDataStore (helpers).
 */
export type MasterDataStore = MasterDataExtensionStore &
	MasterDataVariantStore & {
		getRefCountryByCode(code: string): Promise<Result<RefCountry | null>>;
		getRefCurrencyByCode(code: string): Promise<Result<RefCurrency | null>>;
		getRefLanguageByCode(code: string): Promise<Result<RefLanguage | null>>;
		getRefTimeZoneByIana(ianaName: string): Promise<Result<RefTimeZone | null>>;
		getRefUomDimensionByCode(
			code: string,
		): Promise<Result<RefUomDimension | null>>;
		getRefUomById(id: string): Promise<Result<RefUom | null>>;
		getRefUomByCode(code: string): Promise<Result<RefUom | null>>;
		listRefUoms(): Promise<Result<RefUom[]>>;

		getPartyById(
			organizationId: string,
			id: string,
		): Promise<Result<Party | null>>;
		getPartyByCode(
			organizationId: string,
			normalizedCode: string,
		): Promise<Result<Party | null>>;
		listParties(filter: ListFilter): Promise<Result<Party[]>>;
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
			record: LifecycleRecord,
			ports: MutationPorts,
			meta: { correlationId: string; eventSuffix: string },
		): Promise<Result<Party>>;
		mergeParties(
			record: PartyMergeRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<{ survivor: Party; merged: Party }>>;

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
			record: LifecycleRecord,
			ports: MutationPorts,
			meta: { correlationId: string; eventSuffix: string },
		): Promise<Result<ItemGroup>>;

		getItemById(
			organizationId: string,
			id: string,
		): Promise<Result<Item | null>>;
		getItemByCode(
			organizationId: string,
			normalizedCode: string,
		): Promise<Result<Item | null>>;
		listItems(filter: ListFilter): Promise<Result<Item[]>>;
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
			record: LifecycleRecord,
			ports: MutationPorts,
			meta: { correlationId: string; eventSuffix: string },
		): Promise<Result<Item>>;

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
			record: LifecycleRecord,
			ports: MutationPorts,
			meta: { correlationId: string; eventSuffix: string },
		): Promise<Result<Warehouse>>;

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
			record: LifecycleRecord,
			ports: MutationPorts,
			meta: { correlationId: string; eventSuffix: string },
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
			record: LifecycleRecord,
			ports: MutationPorts,
			meta: { correlationId: string; eventSuffix: string },
		): Promise<Result<TaxRegistration>>;
	};
