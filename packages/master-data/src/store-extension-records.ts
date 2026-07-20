import type { Result } from "@afenda/errors/result";
import type { MutationPorts } from "./ports";
import type { LifecycleRecord } from "./store";
import type {
	ItemAlias,
	ItemBarcode,
	ItemExternalId,
	ItemUom,
	ItemUomUsage,
	Party,
	PartyAddress,
	PartyContact,
	PartyExternalId,
	PartyRelationship,
	PartyRole,
	PartyRoleCode,
	Warehouse,
	WarehouseExternalId,
} from "./types";

export type PartyRoleCreateRecord = {
	organizationId: string;
	partyId: string;
	roleCode: PartyRoleCode;
	createdBy: string;
	validFrom?: Date | null;
	validTo?: Date | null;
};

export type PartyAddressCreateRecord = {
	organizationId: string;
	partyId: string;
	addressType: string;
	line1: string;
	line2?: string | null;
	city: string;
	region?: string | null;
	postalCode?: string | null;
	countryId: string;
	isDefault?: boolean;
	createdBy: string;
};

export type PartyAddressUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	addressType?: string;
	line1?: string;
	line2?: string | null;
	city?: string;
	region?: string | null;
	postalCode?: string | null;
	countryId?: string;
	isDefault?: boolean;
};

export type PartyContactCreateRecord = {
	organizationId: string;
	partyId: string;
	contactType: string;
	value: string;
	purpose?: string | null;
	isPrimary?: boolean;
	createdBy: string;
};

export type PartyContactUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	contactType?: string;
	value?: string;
	purpose?: string | null;
	isPrimary?: boolean;
};

export type PartyExternalIdCreateRecord = {
	organizationId: string;
	partyId: string;
	system: string;
	namespace: string;
	externalId: string;
	createdBy: string;
};

export type PartyRelationshipCreateRecord = {
	organizationId: string;
	fromPartyId: string;
	toPartyId: string;
	relationshipType: string;
	createdBy: string;
};

export type ItemUomCreateRecord = {
	organizationId: string;
	itemId: string;
	uomId: string;
	toBaseNumerator: string;
	toBaseDenominator: string;
	usage: ItemUomUsage;
	barcode?: string | null;
	roundingRule?: string | null;
	minQuantity?: string | null;
	createdBy: string;
};

export type ItemBarcodeCreateRecord = {
	organizationId: string;
	itemId: string;
	barcode: string;
	barcodeType: string;
	isPrimary?: boolean;
	createdBy: string;
};

export type ItemExternalIdCreateRecord = {
	organizationId: string;
	itemId: string;
	system: string;
	namespace: string;
	externalId: string;
	createdBy: string;
};

export type ItemAliasCreateRecord = {
	organizationId: string;
	itemId: string;
	aliasCode: string;
	normalizedAlias: string;
	createdBy: string;
};

export type WarehouseExternalIdCreateRecord = {
	organizationId: string;
	warehouseId: string;
	system: string;
	namespace: string;
	externalId: string;
	createdBy: string;
};

export type ParentListFilter = {
	organizationId: string;
	parentId: string;
	page: number;
	pageSize: number;
};

export type MasterDataExtensionStore = {
	countActivePartyRoles(
		organizationId: string,
		partyId: string,
	): Promise<Result<number>>;
	listPartyRoles(filter: ParentListFilter): Promise<Result<PartyRole[]>>;
	createPartyRole(
		record: PartyRoleCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyRole>>;
	transitionPartyRole(
		record: LifecycleRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
	): Promise<Result<PartyRole>>;

	listPartyAddresses(filter: ParentListFilter): Promise<Result<PartyAddress[]>>;
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

	createPartyExternalId(
		record: PartyExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyExternalId>>;
	findPartyByExternalId(
		organizationId: string,
		system: string,
		namespace: string,
		externalId: string,
	): Promise<Result<Party | null>>;

	createPartyRelationship(
		record: PartyRelationshipCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyRelationship>>;

	createItemUom(
		record: ItemUomCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemUom>>;
	listItemUoms(filter: ParentListFilter): Promise<Result<ItemUom[]>>;

	createItemBarcode(
		record: ItemBarcodeCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemBarcode>>;

	createItemExternalId(
		record: ItemExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemExternalId>>;
	findItemByExternalId(
		organizationId: string,
		system: string,
		namespace: string,
		externalId: string,
	): Promise<Result<import("./types").Item | null>>;

	createItemAlias(
		record: ItemAliasCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemAlias>>;
	findItemByAlias(
		organizationId: string,
		normalizedAlias: string,
	): Promise<Result<import("./types").Item | null>>;

	createWarehouseExternalId(
		record: WarehouseExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WarehouseExternalId>>;
	findWarehouseByExternalId(
		organizationId: string,
		system: string,
		namespace: string,
		externalId: string,
	): Promise<Result<Warehouse | null>>;
};
