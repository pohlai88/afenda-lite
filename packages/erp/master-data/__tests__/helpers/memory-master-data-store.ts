import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import type { MasterDataEventType } from "@afenda/events";
import { isWarehouseParentTypeCompatible } from "../../src/capabilities/core-organization-masters/core-master-policy";
import { resolveItemOperationalProfile } from "../../src/capabilities/core-organization-masters/item-operational-profile";
import {
	assertLifecycleTransition,
	assertRestoreTransition,
	assertTaxRegistrationLifecycleTransition,
} from "../../src/capabilities/core-organization-masters/lifecycle";
import type { OrganizationDimensionStore } from "../../src/capabilities/core-organization-masters/organization-dimension-store";
import { normalizePaymentTermRule } from "../../src/capabilities/core-organization-masters/payment-term-rule";
import type {
	ChangeRequestCreateRecord,
	ChangeRequestListFilter,
	ChangeRequestReviewRecord,
	ImportBatchCreateRecord,
	ImportBatchRecord,
	ItemAliasCreateRecord,
	ItemBarcodeCreateRecord,
	ItemCreateRecord,
	ItemExternalIdCreateRecord,
	ItemGroupCreateRecord,
	ItemGroupLifecycleEventSuffix,
	ItemGroupLifecycleRecord,
	ItemGroupUpdateRecord,
	ItemLifecycleEventSuffix,
	ItemLifecycleRecord,
	ItemListFilter,
	ItemUomCreateRecord,
	ItemUpdateRecord,
	ListFilter,
	MasterDataStore,
	ParentListFilter,
	PartyAddressCreateRecord,
	PartyAddressUpdateRecord,
	PartyByRoleFilter,
	PartyContactCreateRecord,
	PartyContactUpdateRecord,
	PartyContactVerificationRecord,
	PartyCreateRecord,
	PartyExternalIdCreateRecord,
	PartyLifecycleEventSuffix,
	PartyLifecycleRecord,
	PartyMergeRecord,
	PartyRelationshipCreateRecord,
	PartyRoleCreateRecord,
	PartyRoleUpdateRecord,
	PartySearchFilter,
	PartyTaxRegistrationLookup,
	PartyUpdateRecord,
	PaymentTermCreateRecord,
	PaymentTermLifecycleEventSuffix,
	PaymentTermLifecycleRecord,
	PaymentTermUpdateRecord,
	TaxRegistrationCreateRecord,
	TaxRegistrationLifecycleEventSuffix,
	TaxRegistrationLifecycleRecord,
	TaxRegistrationListFilter,
	TaxRegistrationOverlapQuery,
	TaxRegistrationUpdateRecord,
	WarehouseCreateRecord,
	WarehouseExternalIdCreateRecord,
	WarehouseLifecycleEventSuffix,
	WarehouseLifecycleRecord,
	WarehouseMoveRecord,
	WarehouseUpdateRecord,
} from "../../src/capabilities/core-organization-masters/store";
import { createMemoryOrganizationDimensionStore } from "../../src/capabilities/core-organization-masters/testing-organization-dimension-store";
import {
	isInvalidValidityRange,
	validityRangesOverlap,
} from "../../src/capabilities/core-organization-masters/validity-overlap";
import { buildCombinationKey } from "../../src/capabilities/core-organization-masters/variant-signature";
import { assertExpectedVersion as assertExpectedCoreVersion } from "../../src/capabilities/core-organization-masters/version-cas";
import {
	assertExtensionTransitionReason,
	assertStandardChildLifecycleStatus,
	resolveExtensionLifecycleTransition,
} from "../../src/capabilities/extensions/extension-lifecycle";
import {
	createExtensionEventPayload,
	EXTENSION_EVENT_TYPES,
	type ExtensionEventPayload,
	extensionEventClassification,
	partyRoleLifecycleEventType,
} from "../../src/capabilities/extensions/extension-transaction-contract";
import {
	assertExpectedExtensionVersion,
	nextExtensionVersion,
} from "../../src/capabilities/extensions/extension-version-cas";
import { normalizeExternalId } from "../../src/capabilities/extensions/external-id-normalization";
import {
	normalizeItemAlias,
	normalizeItemAliasSource,
} from "../../src/capabilities/extensions/item-alias-policy";
import {
	normalizeBarcode,
	normalizeBarcodePackQuantity,
} from "../../src/capabilities/extensions/item-barcode-policy";
import {
	assertItemUomCompatibility,
	normalizeItemUomConversionFactor,
} from "../../src/capabilities/extensions/item-uom-policy";
import { hasPartyParentPath } from "../../src/capabilities/extensions/party-relationship-policy";
import { isSameNullablePrimaryScope } from "../../src/capabilities/extensions/primary-record-policy";
import type {
	ExtensionListPage,
	ItemAliasListFilter,
	ItemAliasLookup,
	ItemAliasSearchFilter,
	ItemBarcodeLookup,
	ItemExternalIdLookup,
	ItemUomCompatibilityContext,
	ItemUomCompatibilityContextFilter,
	ItemUomDefaultFilter,
	ItemUomListFilter,
	PartyExternalIdLookup,
	PartyRelationshipListFilter,
	PartyRoleLifecycleEventSuffix,
	PartyRoleLifecycleRecord,
	PartyRoleListFilter,
} from "../../src/capabilities/extensions/store";
import type {
	ItemTemplateAttributeContext,
	ItemTemplateAttributeCreateRecord,
	ItemTemplateAttributeOptionCreateRecord,
	ItemTemplateCreateRecord,
	ItemTemplateLifecycleEventSuffix,
	ItemTemplateLifecycleRecord,
	ItemTemplateUpdateRecord,
	ItemVariantCreateRecord,
	ItemVariantRetireRecord,
	ListItemVariantsFilter,
} from "../../src/capabilities/extensions/template-store";
import { normalizeVariantAttributeValue } from "../../src/capabilities/extensions/variant-attribute-value-policy";
import type { MasterFailureDetails } from "../../src/contracts/reasons";
import type { MutationPorts } from "../../src/ports";
import type {
	ChangeRequest,
	Item,
	ItemAlias,
	ItemBarcode,
	ItemExternalId,
	ItemGroup,
	ItemTemplate,
	ItemTemplateAttribute,
	ItemTemplateAttributeOption,
	ItemUom,
	ItemVariant,
	ItemVariantAttributeValue,
	Party,
	PartyAddress,
	PartyContact,
	PartyExternalId,
	PartyRelationship,
	PartyRole,
	PaymentTerm,
	RefCountry,
	RefCurrency,
	RefLanguage,
	RefTimeZone,
	RefUom,
	RefUomDimension,
	TaxRegistration,
	Warehouse,
	WarehouseExternalId,
} from "../../src/types";

type SeedRefsInput = {
	countries?: RefCountry[];
	currencies?: RefCurrency[];
	languages?: RefLanguage[];
	timeZones?: RefTimeZone[];
	dimensions?: RefUomDimension[];
	uoms?: RefUom[];
};

/** Stored variant membership row — assembled with item + values on read. */
type ItemVariantMembership = Omit<ItemVariant, "item" | "values">;

function cloneParty(party: Party): Party {
	return { ...party };
}

function cloneItemGroup(group: ItemGroup): ItemGroup {
	return { ...group };
}

function cloneItem(item: Item): Item {
	return { ...item };
}

function cloneWarehouse(warehouse: Warehouse): Warehouse {
	return { ...warehouse };
}

function clonePaymentTerm(term: PaymentTerm): PaymentTerm {
	return { ...term };
}

function cloneTaxRegistration(row: TaxRegistration): TaxRegistration {
	return { ...row };
}

function cloneItemTemplate(template: ItemTemplate): ItemTemplate {
	return { ...template };
}

function cloneItemTemplateAttribute(
	attribute: ItemTemplateAttribute,
): ItemTemplateAttribute {
	return { ...attribute };
}

function cloneItemTemplateAttributeOption(
	option: ItemTemplateAttributeOption,
): ItemTemplateAttributeOption {
	return { ...option };
}

function cloneItemVariantAttributeValue(
	value: ItemVariantAttributeValue,
): ItemVariantAttributeValue {
	return { ...value, optionIds: [...value.optionIds] };
}

function cloneItemVariant(variant: ItemVariant): ItemVariant {
	return {
		...variant,
		item: cloneItem(variant.item),
		values: variant.values.map(cloneItemVariantAttributeValue),
	};
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize;
	return items.slice(start, start + pageSize);
}

function pageResult<T>(
	items: T[],
	page: number,
	pageSize: number,
): ExtensionListPage<T> {
	const start = (page - 1) * pageSize;
	const pageItems = items.slice(start, start + pageSize);
	return {
		items: pageItems,
		page,
		pageSize,
		hasNextPage: start + pageSize < items.length,
	};
}

function codeConflictDetails(): MasterFailureDetails {
	return { reason: "MASTER_CODE_CONFLICT" };
}

function versionConflictDetails(): MasterFailureDetails {
	return { reason: "MASTER_VERSION_CONFLICT" };
}

function crossOrgDetails(): MasterFailureDetails {
	return { reason: "MASTER_CROSS_ORG_REFERENCE" };
}

function validationDetails(message?: string): MasterFailureDetails {
	return { reason: "MASTER_VALIDATION_FAILED", message };
}

/** In-memory MasterDataStore for Vitest only — not a production export. */
export class MemoryMasterDataStore implements MasterDataStore {
	private readonly organizationDimensions: OrganizationDimensionStore =
		createMemoryOrganizationDimensionStore();

	private readonly countries = new Map<string, RefCountry>();
	private readonly currencies = new Map<string, RefCurrency>();
	private readonly languages = new Map<string, RefLanguage>();
	private readonly timeZones = new Map<string, RefTimeZone>();
	private readonly dimensions = new Map<string, RefUomDimension>();
	private readonly uoms = new Map<string, RefUom>();
	private readonly parties = new Map<string, Party>();
	private readonly itemGroups = new Map<string, ItemGroup>();
	private readonly items = new Map<string, Item>();
	private readonly warehouses = new Map<string, Warehouse>();
	private readonly paymentTerms = new Map<string, PaymentTerm>();
	private readonly taxRegistrations = new Map<string, TaxRegistration>();
	private readonly partyRoles = new Map<string, PartyRole>();
	private readonly partyAddresses = new Map<string, PartyAddress>();
	private readonly partyContacts = new Map<string, PartyContact>();
	private readonly partyExternalIds = new Map<string, PartyExternalId>();
	private readonly partyRelationships = new Map<string, PartyRelationship>();
	private readonly itemUoms = new Map<string, ItemUom>();
	private readonly itemBarcodes = new Map<string, ItemBarcode>();
	private readonly itemExternalIds = new Map<string, ItemExternalId>();
	private readonly itemAliases = new Map<string, ItemAlias>();
	private readonly warehouseExternalIds = new Map<
		string,
		WarehouseExternalId
	>();
	private readonly changeRequests = new Map<string, ChangeRequest>();
	private readonly importBatches = new Map<string, ImportBatchRecord>();
	private readonly itemTemplates = new Map<string, ItemTemplate>();
	private readonly itemTemplateAttributes = new Map<
		string,
		ItemTemplateAttribute
	>();
	private readonly itemTemplateAttributeOptions = new Map<
		string,
		ItemTemplateAttributeOption
	>();
	private readonly itemVariants = new Map<string, ItemVariantMembership>();
	private readonly itemVariantAttributeValues = new Map<
		string,
		ItemVariantAttributeValue
	>();

	create(
		record: Parameters<OrganizationDimensionStore["create"]>[0],
	): ReturnType<OrganizationDimensionStore["create"]> {
		return this.organizationDimensions.create(record);
	}

	update(
		record: Parameters<OrganizationDimensionStore["update"]>[0],
	): ReturnType<OrganizationDimensionStore["update"]> {
		return this.organizationDimensions.update(record);
	}

	transition(
		input: Parameters<OrganizationDimensionStore["transition"]>[0],
	): ReturnType<OrganizationDimensionStore["transition"]> {
		return this.organizationDimensions.transition(input);
	}

	getById(
		input: Parameters<OrganizationDimensionStore["getById"]>[0],
	): ReturnType<OrganizationDimensionStore["getById"]> {
		return this.organizationDimensions.getById(input);
	}

	getByCode(
		input: Parameters<OrganizationDimensionStore["getByCode"]>[0],
	): ReturnType<OrganizationDimensionStore["getByCode"]> {
		return this.organizationDimensions.getByCode(input);
	}

	list(
		input: Parameters<OrganizationDimensionStore["list"]>[0],
	): ReturnType<OrganizationDimensionStore["list"]> {
		return this.organizationDimensions.list(input);
	}

	findEffective(
		input: Parameters<OrganizationDimensionStore["findEffective"]>[0],
	): ReturnType<OrganizationDimensionStore["findEffective"]> {
		return this.organizationDimensions.findEffective(input);
	}

	findEffectiveById(
		input: Parameters<OrganizationDimensionStore["findEffectiveById"]>[0],
	): ReturnType<OrganizationDimensionStore["findEffectiveById"]> {
		return this.organizationDimensions.findEffectiveById(input);
	}

	seedRefs(refs: SeedRefsInput): void {
		for (const row of refs.countries ?? []) {
			this.countries.set(row.id, { ...row });
		}
		for (const row of refs.currencies ?? []) {
			this.currencies.set(row.id, { ...row });
		}
		for (const row of refs.languages ?? []) {
			this.languages.set(row.id, { ...row });
		}
		for (const row of refs.timeZones ?? []) {
			this.timeZones.set(row.id, { ...row });
		}
		for (const row of refs.dimensions ?? []) {
			this.dimensions.set(row.id, { ...row });
		}
		for (const row of refs.uoms ?? []) {
			this.uoms.set(row.id, { ...row });
		}
	}

	async getRefCountryByCode(code: string): Promise<Result<RefCountry | null>> {
		const normalized = code.trim().toUpperCase();
		for (const row of this.countries.values()) {
			if (row.code.toUpperCase() === normalized) {
				return ok({ ...row });
			}
		}
		return ok(null);
	}

	async getRefCountryById(id: string): Promise<Result<RefCountry | null>> {
		const row = this.countries.get(id);
		return ok(row === undefined ? null : { ...row });
	}

	async getRefCurrencyByCode(
		code: string,
	): Promise<Result<RefCurrency | null>> {
		const normalized = code.trim().toUpperCase();
		for (const row of this.currencies.values()) {
			if (row.code.toUpperCase() === normalized) {
				return ok({ ...row });
			}
		}
		return ok(null);
	}

	async getRefCurrencyById(id: string): Promise<Result<RefCurrency | null>> {
		const row = this.currencies.get(id);
		return ok(row === undefined ? null : { ...row });
	}

	async getRefLanguageByCode(
		code: string,
	): Promise<Result<RefLanguage | null>> {
		const normalized = code.trim().toLowerCase();
		for (const row of this.languages.values()) {
			if (row.code.toLowerCase() === normalized) {
				return ok({ ...row });
			}
		}
		return ok(null);
	}

	async getRefTimeZoneByIana(
		ianaName: string,
	): Promise<Result<RefTimeZone | null>> {
		const normalized = ianaName.trim();
		for (const row of this.timeZones.values()) {
			if (row.ianaName === normalized) {
				return ok({ ...row });
			}
		}
		return ok(null);
	}

	async getRefUomDimensionByCode(
		code: string,
	): Promise<Result<RefUomDimension | null>> {
		const normalized = code.trim().toLowerCase();
		for (const row of this.dimensions.values()) {
			if (row.code === normalized) {
				return ok({ ...row });
			}
		}
		return ok(null);
	}

	async getRefUomById(id: string): Promise<Result<RefUom | null>> {
		const row = this.uoms.get(id);
		return ok(row === undefined ? null : { ...row });
	}

	async getRefUomByCode(code: string): Promise<Result<RefUom | null>> {
		const normalized = code.trim().toUpperCase();
		for (const row of this.uoms.values()) {
			if (row.code.toUpperCase() === normalized) {
				return ok({ ...row });
			}
		}
		return ok(null);
	}

	async listRefUoms(): Promise<Result<RefUom[]>> {
		return ok([...this.uoms.values()].map((row) => ({ ...row })));
	}

	async getPartyById(
		organizationId: string,
		id: string,
	): Promise<Result<Party | null>> {
		const row = this.parties.get(id);
		if (row === undefined || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneParty(row));
	}

	async getPartyByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Party | null>> {
		for (const row of this.parties.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null &&
				row.mergedIntoId === null
			) {
				return ok(cloneParty(row));
			}
		}
		return ok(null);
	}

	async listParties(filter: ListFilter): Promise<Result<Party[]>> {
		const rows = [...this.parties.values()]
			.filter(
				(row) =>
					row.organizationId === filter.organizationId &&
					(filter.status === undefined || row.status === filter.status) &&
					(filter.updatedSince === undefined ||
						row.updatedAt > filter.updatedSince),
			)
			.sort((a, b) =>
				a.normalizedCode === b.normalizedCode
					? a.id.localeCompare(b.id)
					: a.normalizedCode.localeCompare(b.normalizedCode),
			);
		return ok(paginate(rows, filter.page, filter.pageSize).map(cloneParty));
	}

	async listPartiesByRole(filter: PartyByRoleFilter): Promise<Result<Party[]>> {
		const partyIds = new Set(
			[...this.partyRoles.values()]
				.filter(
					(row) =>
						row.organizationId === filter.organizationId &&
						row.roleCode === filter.roleCode &&
						row.archivedAt === null &&
						(!filter.activeOnly || row.status === "active"),
				)
				.map((row) => row.partyId),
		);
		const rows = [...this.parties.values()]
			.filter(
				(row) =>
					partyIds.has(row.id) &&
					row.organizationId === filter.organizationId &&
					(filter.status === undefined || row.status === filter.status) &&
					(filter.updatedSince === undefined ||
						row.updatedAt > filter.updatedSince),
			)
			.sort((a, b) =>
				a.normalizedCode === b.normalizedCode
					? a.id.localeCompare(b.id)
					: a.normalizedCode.localeCompare(b.normalizedCode),
			);
		return ok(paginate(rows, filter.page, filter.pageSize).map(cloneParty));
	}

	async findPartyByTaxRegistration(
		filter: PartyTaxRegistrationLookup,
	): Promise<Result<Party | null>> {
		for (const registration of this.taxRegistrations.values()) {
			if (
				registration.organizationId !== filter.organizationId ||
				registration.jurisdictionCountryId !== filter.jurisdictionCountryId ||
				registration.registrationType !== filter.registrationType ||
				registration.normalizedRegistrationNumber !==
					filter.normalizedRegistrationNumber ||
				registration.deletedAt !== null
			) {
				continue;
			}
			const party = this.parties.get(registration.partyId);
			if (
				party !== undefined &&
				party.organizationId === filter.organizationId &&
				party.retiredAt === null &&
				party.mergedIntoId === null
			) {
				return ok(cloneParty(party));
			}
		}
		return ok(null);
	}

	async searchParties(filter: PartySearchFilter): Promise<Result<Party[]>> {
		const needle = filter.query.trim().toUpperCase();
		const rows = [...this.parties.values()]
			.filter(
				(row) =>
					row.organizationId === filter.organizationId &&
					(filter.status === undefined || row.status === filter.status) &&
					(filter.updatedSince === undefined ||
						row.updatedAt > filter.updatedSince) &&
					(row.normalizedCode.includes(needle) ||
						row.name.toUpperCase().includes(needle) ||
						(row.legalName?.toUpperCase().includes(needle) ?? false) ||
						(row.tradingName?.toUpperCase().includes(needle) ?? false)),
			)
			.sort((a, b) =>
				a.normalizedCode === b.normalizedCode
					? a.id.localeCompare(b.id)
					: a.normalizedCode.localeCompare(b.normalizedCode),
			);
		return ok(paginate(rows, filter.page, filter.pageSize).map(cloneParty));
	}

	async createParty(
		record: PartyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Party>> {
		if (this.hasLivePartyCode(record.organizationId, record.normalizedCode)) {
			return fail(
				"CONFLICT",
				"Party code already exists",
				codeConflictDetails(),
			);
		}
		const now = new Date();
		const party: Party = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			name: record.name,
			partyKind: record.partyKind,
			status: "draft",
			version: 1,
			legalName: record.legalName ?? null,
			tradingName: record.tradingName ?? null,
			registrationNumber: record.registrationNumber ?? null,
			registrationCountryId: record.registrationCountryId ?? null,
			preferredLanguageId: record.preferredLanguageId ?? null,
			defaultCurrencyId: record.defaultCurrencyId ?? null,
			mergedIntoId: null,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			activatedAt: null,
			activatedBy: null,
			blockedAt: null,
			blockedBy: null,
			retiredAt: null,
			retiredBy: null,
			createdAt: now,
			updatedAt: now,
		};
		this.parties.set(party.id, party);
		const sideEffect = await this.commitMutation(
			() => {
				this.parties.delete(party.id);
			},
			ports,
			{
				organizationId: party.organizationId,
				actorUserId: party.createdBy,
				correlationId: meta.correlationId,
				entity: "party",
				entityId: party.id,
				action: "CREATE",
				changes: [{ field: "code", oldValue: null, newValue: party.code }],
				newValue: { code: party.code, status: party.status },
				type: "master_data.party.created.v1",
				code: party.code,
				version: party.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneParty(party));
	}

	async updateParty(
		record: PartyUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Party>> {
		const existing = this.parties.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Party not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Party belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Party version conflict",
				versionConflictDetails(),
			);
		}
		const snapshot = cloneParty(existing);
		const updated: Party = {
			...existing,
			name: record.name ?? existing.name,
			legalName:
				record.legalName !== undefined ? record.legalName : existing.legalName,
			tradingName:
				record.tradingName !== undefined
					? record.tradingName
					: existing.tradingName,
			registrationNumber:
				record.registrationNumber !== undefined
					? record.registrationNumber
					: existing.registrationNumber,
			registrationCountryId:
				record.registrationCountryId !== undefined
					? record.registrationCountryId
					: existing.registrationCountryId,
			preferredLanguageId:
				record.preferredLanguageId !== undefined
					? record.preferredLanguageId
					: existing.preferredLanguageId,
			defaultCurrencyId:
				record.defaultCurrencyId !== undefined
					? record.defaultCurrencyId
					: existing.defaultCurrencyId,
			version: existing.version + 1,
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		this.parties.set(updated.id, updated);
		const sideEffect = await this.commitMutation(
			() => {
				this.parties.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "party",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{ field: "name", oldValue: snapshot.name, newValue: updated.name },
				],
				oldValue: { name: snapshot.name, version: snapshot.version },
				newValue: { name: updated.name, version: updated.version },
				type: "master_data.party.updated.v1",
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneParty(updated));
	}

	async transitionParty(
		record: PartyLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PartyLifecycleEventSuffix;
		},
	): Promise<Result<Party>> {
		const existing = this.parties.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Party not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Party belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Party version conflict",
				versionConflictDetails(),
			);
		}
		const lifecycle =
			record.toStatus === "draft"
				? assertRestoreTransition(existing.status, "draft")
				: assertLifecycleTransition(existing.status, record.toStatus);
		if (!lifecycle.ok) {
			return lifecycle;
		}
		if (
			record.toStatus === "active" &&
			record.requireActiveRole &&
			![...this.partyRoles.values()].some(
				(role) =>
					role.organizationId === record.organizationId &&
					role.partyId === record.id &&
					role.status === "active" &&
					role.retiredAt === null,
			)
		) {
			return fail(
				"CONFLICT",
				"Party activation requires at least one active role",
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
			);
		}
		let crSnapshot: ChangeRequest | null = null;
		if (record.changeRequestId !== undefined) {
			const cr = this.changeRequests.get(record.changeRequestId);
			if (
				cr === undefined ||
				cr.organizationId !== record.organizationId ||
				cr.status !== "approved" ||
				cr.commandKind !== "activate_party" ||
				cr.subjectEntityId !== record.id
			) {
				return fail("CONFLICT", "Change request cannot be claimed", {
					reason: "MASTER_CHANGE_REQUEST_INVALID",
				} satisfies MasterFailureDetails);
			}
			crSnapshot = { ...cr };
			this.changeRequests.set(cr.id, {
				...cr,
				status: "applied",
				version: cr.version + 1,
				appliedBy: record.actorUserId,
				appliedAt: new Date(),
				updatedAt: new Date(),
			});
		}
		const snapshot = cloneParty(existing);
		const now = new Date();
		const updated: Party = {
			...existing,
			status: record.toStatus,
			version: existing.version + 1,
			updatedBy: record.actorUserId,
			updatedAt: now,
			activatedAt:
				record.toStatus === "active"
					? (existing.activatedAt ?? now)
					: existing.activatedAt,
			activatedBy:
				record.toStatus === "active"
					? (existing.activatedBy ?? record.actorUserId)
					: existing.activatedBy,
			blockedAt: record.toStatus === "blocked" ? now : existing.blockedAt,
			blockedBy:
				record.toStatus === "blocked" ? record.actorUserId : existing.blockedBy,
			retiredAt: record.toStatus === "retired" ? now : null,
			retiredBy: record.toStatus === "retired" ? record.actorUserId : null,
		};
		if (record.toStatus === "draft" && existing.status === "retired") {
			updated.retiredAt = null;
			updated.retiredBy = null;
			updated.blockedAt = null;
			updated.blockedBy = null;
		}
		this.parties.set(updated.id, updated);
		const eventType =
			`master_data.party.${meta.eventSuffix}.v1` as MasterDataEventType;
		const sideEffect = await this.commitMutation(
			() => {
				this.parties.set(snapshot.id, snapshot);
				if (crSnapshot !== null) {
					this.changeRequests.set(crSnapshot.id, crSnapshot);
				}
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "party",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "status",
						oldValue: snapshot.status,
						newValue: updated.status,
					},
				],
				oldValue: { status: snapshot.status, version: snapshot.version },
				newValue: { status: updated.status, version: updated.version },
				type: eventType,
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		if (crSnapshot !== null) {
			const applied = this.changeRequests.get(crSnapshot.id);
			if (applied !== undefined) {
				const crSide = await this.commitMutation(
					() => {
						this.changeRequests.set(crSnapshot.id, crSnapshot);
					},
					ports,
					{
						organizationId: applied.organizationId,
						actorUserId: record.actorUserId,
						correlationId: meta.correlationId,
						entity: "change_request",
						entityId: applied.id,
						action: "UPDATE",
						changes: [
							{
								field: "status",
								oldValue: "approved",
								newValue: "applied",
							},
						],
						type: "master_data.change_request.applied.v1",
						code: applied.code,
						version: applied.version,
					},
				);
				if (!crSide.ok) {
					return crSide;
				}
			}
		}
		return ok(cloneParty(updated));
	}

	async mergeParties(
		record: PartyMergeRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<{ survivor: Party; merged: Party }>> {
		const source = this.parties.get(record.sourcePartyId);
		const target = this.parties.get(record.targetPartyId);
		if (
			source === undefined ||
			source.organizationId !== record.organizationId ||
			target === undefined ||
			target.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Party not found for merge", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		if (source.mergedIntoId !== null || target.mergedIntoId !== null) {
			return fail("CONFLICT", "Party already merged", {
				reason: "MASTER_INVALID_STATE",
			});
		}
		if (source.partyKind !== target.partyKind) {
			return fail("CONFLICT", "Incompatible party kinds for merge", {
				reason: "MASTER_INVALID_STATE",
			});
		}
		if (
			source.version !== record.sourceExpectedVersion ||
			target.version !== record.targetExpectedVersion
		) {
			return fail("CONFLICT", "Party version conflict on merge", {
				reason: "MASTER_VERSION_CONFLICT",
			});
		}

		const cr = this.changeRequests.get(record.changeRequestId);
		if (
			cr === undefined ||
			cr.organizationId !== record.organizationId ||
			cr.status !== "approved" ||
			cr.commandKind !== "merge_parties" ||
			cr.subjectEntityId !== target.id
		) {
			return fail("CONFLICT", "Change request cannot be claimed", {
				reason: "MASTER_CHANGE_REQUEST_INVALID",
			} satisfies MasterFailureDetails);
		}
		const crSnapshot = { ...cr };
		this.changeRequests.set(cr.id, {
			...cr,
			status: "applied",
			version: cr.version + 1,
			appliedBy: record.actorUserId,
			appliedAt: new Date(),
			updatedAt: new Date(),
		});

		const sourceSnapshot = cloneParty(source);
		const targetSnapshot = cloneParty(target);
		const now = new Date();
		const decide = <T>(
			decision: "source" | "target" | undefined,
			sourceValue: T,
			targetValue: T,
		): T => (decision === "source" ? sourceValue : targetValue);

		const survivor: Party = {
			...target,
			name: decide(record.fieldDecisions.name, source.name, target.name),
			legalName: decide(
				record.fieldDecisions.legalName,
				source.legalName,
				target.legalName,
			),
			tradingName: decide(
				record.fieldDecisions.tradingName,
				source.tradingName,
				target.tradingName,
			),
			registrationNumber: decide(
				record.fieldDecisions.registrationNumber,
				source.registrationNumber,
				target.registrationNumber,
			),
			registrationCountryId: decide(
				record.fieldDecisions.registrationCountryId,
				source.registrationCountryId,
				target.registrationCountryId,
			),
			preferredLanguageId: decide(
				record.fieldDecisions.preferredLanguageId,
				source.preferredLanguageId,
				target.preferredLanguageId,
			),
			defaultCurrencyId: decide(
				record.fieldDecisions.defaultCurrencyId,
				source.defaultCurrencyId,
				target.defaultCurrencyId,
			),
			version: target.version + 1,
			updatedBy: record.actorUserId,
			updatedAt: now,
		};

		const merged: Party = {
			...source,
			mergedIntoId: target.id,
			status: "retired",
			version: source.version + 1,
			updatedBy: record.actorUserId,
			updatedAt: now,
			retiredAt: now,
			retiredBy: record.actorUserId,
		};

		this.parties.set(survivor.id, survivor);
		this.parties.set(merged.id, merged);

		const roleSnapshots: PartyRole[] = [];
		const addressSnapshots: PartyAddress[] = [];
		const contactSnapshots: PartyContact[] = [];
		const survivorActiveRoleCodes = new Set(
			[...this.partyRoles.values()]
				.filter(
					(role) =>
						role.organizationId === record.organizationId &&
						role.partyId === survivor.id &&
						role.status === "active",
				)
				.map((role) => role.roleCode),
		);
		let rolesReassigned = 0;
		let rolesRetiredColliding = 0;
		for (const role of this.partyRoles.values()) {
			if (
				role.organizationId !== record.organizationId ||
				role.partyId !== source.id
			) {
				continue;
			}
			roleSnapshots.push({ ...role });
			if (
				role.status === "active" &&
				survivorActiveRoleCodes.has(role.roleCode)
			) {
				const archived: PartyRole = {
					...role,
					status: "archived",
					version: role.version + 1,
					updatedBy: record.actorUserId,
					updatedAt: now,
					archivedAt: now,
					archivedBy: record.actorUserId,
				};
				this.partyRoles.set(role.id, archived);
				rolesRetiredColliding += 1;
				continue;
			}
			if (role.status === "active") {
				survivorActiveRoleCodes.add(role.roleCode);
			}
			const movedRole: PartyRole = {
				...role,
				partyId: survivor.id,
				version: role.version + 1,
				updatedBy: record.actorUserId,
				updatedAt: now,
			};
			this.partyRoles.set(role.id, movedRole);
			rolesReassigned += 1;
		}
		let addressesMoved = 0;
		for (const address of this.partyAddresses.values()) {
			if (
				address.organizationId !== record.organizationId ||
				address.partyId !== source.id
			) {
				continue;
			}
			addressSnapshots.push({ ...address });
			this.partyAddresses.set(address.id, {
				...address,
				partyId: survivor.id,
				version: address.version + 1,
				updatedBy: record.actorUserId,
				updatedAt: now,
			});
			addressesMoved += 1;
		}
		let contactsMoved = 0;
		for (const contact of this.partyContacts.values()) {
			if (
				contact.organizationId !== record.organizationId ||
				contact.partyId !== source.id
			) {
				continue;
			}
			contactSnapshots.push({ ...contact });
			this.partyContacts.set(contact.id, {
				...contact,
				partyId: survivor.id,
				version: contact.version + 1,
				updatedBy: record.actorUserId,
				updatedAt: now,
			});
			contactsMoved += 1;
		}

		const movedExternalIds: PartyExternalId[] = [];
		for (const ext of this.partyExternalIds.values()) {
			if (
				ext.organizationId === record.organizationId &&
				ext.partyId === source.id
			) {
				const conflict = [...this.partyExternalIds.values()].some(
					(other) =>
						other.id !== ext.id &&
						other.organizationId === ext.organizationId &&
						other.sourceSystem === ext.sourceSystem &&
						other.externalIdType === ext.externalIdType &&
						other.normalizedValue === ext.normalizedValue &&
						other.partyId === survivor.id,
				);
				if (!conflict) {
					const moved = { ...ext, partyId: survivor.id };
					this.partyExternalIds.set(ext.id, moved);
					movedExternalIds.push(ext);
				}
			}
		}

		const formerCodeId = randomUUID();
		const formerCodeRow: PartyExternalId = {
			id: formerCodeId,
			organizationId: record.organizationId,
			partyId: survivor.id,
			sourceSystem: "afenda.former_code",
			externalIdType: "party_code",
			externalValue: source.code,
			normalizedValue: source.normalizedCode,
			caseSensitivity: "insensitive",
			isPrimary: false,
			status: "active",
			version: 1,
			archivedAt: null,
			archivedBy: null,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			createdAt: now,
			updatedAt: now,
		};
		const formerConflict = [...this.partyExternalIds.values()].some(
			(other) =>
				other.organizationId === formerCodeRow.organizationId &&
				other.sourceSystem === formerCodeRow.sourceSystem &&
				other.externalIdType === formerCodeRow.externalIdType &&
				other.normalizedValue === formerCodeRow.normalizedValue,
		);
		if (!formerConflict) {
			this.partyExternalIds.set(formerCodeId, formerCodeRow);
		}

		const sideEffect = await this.commitMutation(
			() => {
				this.parties.set(sourceSnapshot.id, sourceSnapshot);
				this.parties.set(targetSnapshot.id, targetSnapshot);
				this.changeRequests.set(crSnapshot.id, crSnapshot);
				for (const role of roleSnapshots) {
					this.partyRoles.set(role.id, role);
				}
				for (const address of addressSnapshots) {
					this.partyAddresses.set(address.id, address);
				}
				for (const contact of contactSnapshots) {
					this.partyContacts.set(contact.id, contact);
				}
				for (const ext of movedExternalIds) {
					this.partyExternalIds.set(ext.id, ext);
				}
				this.partyExternalIds.delete(formerCodeId);
			},
			ports,
			{
				organizationId: record.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "party",
				entityId: survivor.id,
				action: "UPDATE",
				changes: [
					{
						field: "merged_from",
						oldValue: null,
						newValue: source.id,
					},
					{
						field: "merged_into_id",
						oldValue: null,
						newValue: survivor.id,
					},
				],
				oldValue: {
					sourceId: source.id,
					sourceVersion: sourceSnapshot.version,
					targetVersion: targetSnapshot.version,
				},
				newValue: {
					survivorId: survivor.id,
					mergedId: merged.id,
					survivorVersion: survivor.version,
					fieldDecisions: record.fieldDecisions,
					consolidation: {
						rolesReassigned,
						rolesRetiredColliding,
						addressesMoved,
						contactsMoved,
					},
				},
				type: "master_data.party.merged.v1",
				code: survivor.code,
				version: survivor.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		const applied = this.changeRequests.get(crSnapshot.id);
		if (applied !== undefined) {
			const crSide = await this.commitMutation(
				() => {
					this.changeRequests.set(crSnapshot.id, crSnapshot);
				},
				ports,
				{
					organizationId: applied.organizationId,
					actorUserId: record.actorUserId,
					correlationId: meta.correlationId,
					entity: "change_request",
					entityId: applied.id,
					action: "UPDATE",
					changes: [
						{
							field: "status",
							oldValue: "approved",
							newValue: "applied",
						},
					],
					type: "master_data.change_request.applied.v1",
					code: applied.code,
					version: applied.version,
				},
			);
			if (!crSide.ok) {
				return crSide;
			}
		}
		return ok({ survivor: cloneParty(survivor), merged: cloneParty(merged) });
	}

	async getChangeRequestById(
		organizationId: string,
		id: string,
	): Promise<Result<ChangeRequest | null>> {
		const row = this.changeRequests.get(id);
		if (row === undefined || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok({ ...row, payload: { ...row.payload } });
	}

	async listChangeRequests(
		filter: ChangeRequestListFilter,
	): Promise<Result<ChangeRequest[]>> {
		const rows = [...this.changeRequests.values()]
			.filter((row) => {
				if (row.organizationId !== filter.organizationId) {
					return false;
				}
				if (filter.status !== undefined && row.status !== filter.status) {
					return false;
				}
				if (
					filter.commandKind !== undefined &&
					row.commandKind !== filter.commandKind
				) {
					return false;
				}
				return true;
			})
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		return ok(
			paginate(rows, filter.page, filter.pageSize).map((row) => ({
				...row,
				payload: { ...row.payload },
			})),
		);
	}

	async createChangeRequest(
		record: ChangeRequestCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ChangeRequest>> {
		for (const existing of this.changeRequests.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.normalizedCode === record.normalizedCode
			) {
				return fail("CONFLICT", "Change request code already exists", {
					reason: "MASTER_CODE_CONFLICT",
				} satisfies MasterFailureDetails);
			}
		}
		const now = new Date();
		const row: ChangeRequest = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			commandKind: record.commandKind,
			status: "submitted",
			version: 1,
			payload: { ...record.payload },
			subjectEntityType: record.subjectEntityType,
			subjectEntityId: record.subjectEntityId,
			submittedBy: record.submittedBy,
			submittedAt: now,
			reviewedBy: null,
			reviewedAt: null,
			reviewNote: null,
			appliedBy: null,
			appliedAt: null,
			createdAt: now,
			updatedAt: now,
		};
		this.changeRequests.set(row.id, row);
		const side = await this.commitMutation(
			() => {
				this.changeRequests.delete(row.id);
			},
			ports,
			{
				organizationId: row.organizationId,
				actorUserId: record.submittedBy,
				correlationId: meta.correlationId,
				entity: "change_request",
				entityId: row.id,
				action: "CREATE",
				changes: [{ field: "status", oldValue: null, newValue: "submitted" }],
				type: "master_data.change_request.submitted.v1",
				code: row.code,
				version: 1,
			},
		);
		if (!side.ok) {
			return side;
		}
		return ok({ ...row, payload: { ...row.payload } });
	}

	async transitionChangeRequest(
		record: ChangeRequestReviewRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: "approved" | "rejected" },
	): Promise<Result<ChangeRequest>> {
		const existing = this.changeRequests.get(record.id);
		if (
			existing === undefined ||
			existing.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Change request not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.version !== record.expectedVersion) {
			return fail("CONFLICT", "Change request version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		if (existing.status !== "submitted") {
			return fail("CONFLICT", "Change request is not submitted", {
				reason: "MASTER_CHANGE_REQUEST_INVALID",
			} satisfies MasterFailureDetails);
		}
		const snapshot = { ...existing };
		const now = new Date();
		const updated: ChangeRequest = {
			...existing,
			status: record.toStatus,
			version: existing.version + 1,
			reviewedBy: record.actorUserId,
			reviewedAt: now,
			reviewNote: record.reviewNote,
			updatedAt: now,
		};
		this.changeRequests.set(updated.id, updated);
		const side = await this.commitMutation(
			() => {
				this.changeRequests.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "change_request",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "status",
						oldValue: snapshot.status,
						newValue: updated.status,
					},
				],
				type: `master_data.change_request.${meta.eventSuffix}.v1`,
				code: updated.code,
				version: updated.version,
			},
		);
		if (!side.ok) {
			return side;
		}
		return ok({ ...updated, payload: { ...updated.payload } });
	}

	async getItemGroupById(
		organizationId: string,
		id: string,
	): Promise<Result<ItemGroup | null>> {
		const row = this.itemGroups.get(id);
		if (row === undefined || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneItemGroup(row));
	}

	async getItemGroupByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<ItemGroup | null>> {
		for (const row of this.itemGroups.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null
			) {
				return ok(cloneItemGroup(row));
			}
		}
		return ok(null);
	}

	async listItemGroups(filter: ListFilter): Promise<Result<ItemGroup[]>> {
		const rows = [...this.itemGroups.values()]
			.filter(
				(row) =>
					row.organizationId === filter.organizationId &&
					(filter.status === undefined || row.status === filter.status) &&
					(filter.updatedSince === undefined ||
						row.updatedAt > filter.updatedSince),
			)
			.sort((a, b) =>
				a.normalizedCode === b.normalizedCode
					? a.id.localeCompare(b.id)
					: a.normalizedCode.localeCompare(b.normalizedCode),
			);
		return ok(paginate(rows, filter.page, filter.pageSize).map(cloneItemGroup));
	}

	async createItemGroup(
		record: ItemGroupCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemGroup>> {
		if (
			this.hasLiveItemGroupCode(record.organizationId, record.normalizedCode)
		) {
			return fail(
				"CONFLICT",
				"Item group code already exists",
				codeConflictDetails(),
			);
		}
		const parentCheck = this.assertParentItemGroup(
			record.organizationId,
			null,
			record.parentId ?? null,
		);
		if (!parentCheck.ok) {
			return parentCheck;
		}
		const now = new Date();
		const group: ItemGroup = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			name: record.name,
			parentId: record.parentId ?? null,
			status: "draft",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			activatedAt: null,
			activatedBy: null,
			retiredAt: null,
			retiredBy: null,
			createdAt: now,
			updatedAt: now,
		};
		this.itemGroups.set(group.id, group);
		const sideEffect = await this.commitMutation(
			() => {
				this.itemGroups.delete(group.id);
			},
			ports,
			{
				organizationId: group.organizationId,
				actorUserId: group.createdBy,
				correlationId: meta.correlationId,
				entity: "item_group",
				entityId: group.id,
				action: "CREATE",
				changes: [{ field: "code", oldValue: null, newValue: group.code }],
				newValue: { code: group.code, status: group.status },
				type: "master_data.item_group.created.v1",
				code: group.code,
				version: group.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItemGroup(group));
	}

	async updateItemGroup(
		record: ItemGroupUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemGroup>> {
		const existing = this.itemGroups.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Item group not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Item group belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Item group version conflict",
				versionConflictDetails(),
			);
		}
		const nextParentId =
			record.parentId !== undefined ? record.parentId : existing.parentId;
		const parentCheck = this.assertParentItemGroup(
			record.organizationId,
			existing.id,
			nextParentId,
		);
		if (!parentCheck.ok) {
			return parentCheck;
		}
		const snapshot = cloneItemGroup(existing);
		const parentChanged = nextParentId !== existing.parentId;
		const updated: ItemGroup = {
			...existing,
			name: record.name ?? existing.name,
			parentId: nextParentId,
			version: existing.version + 1,
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		this.itemGroups.set(updated.id, updated);
		const sideEffect = await this.commitMutation(
			() => {
				this.itemGroups.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "item_group",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{ field: "name", oldValue: snapshot.name, newValue: updated.name },
					...(parentChanged
						? [
								{
									field: "parentId",
									oldValue: snapshot.parentId,
									newValue: updated.parentId,
								},
							]
						: []),
				],
				oldValue: {
					name: snapshot.name,
					parentId: snapshot.parentId,
					version: snapshot.version,
				},
				newValue: {
					name: updated.name,
					parentId: updated.parentId,
					version: updated.version,
				},
				type: parentChanged
					? "master_data.item_group.reparented.v1"
					: "master_data.item_group.updated.v1",
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItemGroup(updated));
	}

	async transitionItemGroup(
		record: ItemGroupLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: ItemGroupLifecycleEventSuffix;
		},
	): Promise<Result<ItemGroup>> {
		const existing = this.itemGroups.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Item group not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Item group belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Item group version conflict",
				versionConflictDetails(),
			);
		}
		const lifecycle = assertLifecycleTransition(
			existing.status,
			record.toStatus,
		);
		if (!lifecycle.ok) {
			return lifecycle;
		}
		if (record.toStatus === "active" && existing.parentId !== null) {
			const parent = this.itemGroups.get(existing.parentId);
			if (
				parent === undefined ||
				parent.organizationId !== record.organizationId ||
				parent.status !== "active" ||
				parent.retiredAt !== null
			) {
				return fail("CONFLICT", "Item group parent must be active", {
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails);
			}
		}
		if (record.toStatus === "retired") {
			const hasLiveChild = [...this.itemGroups.values()].some(
				(group) =>
					group.organizationId === record.organizationId &&
					group.parentId === record.id &&
					group.retiredAt === null,
			);
			const hasLiveItem = [...this.items.values()].some(
				(item) =>
					item.organizationId === record.organizationId &&
					item.itemGroupId === record.id &&
					item.retiredAt === null,
			);
			if (hasLiveChild || hasLiveItem) {
				return fail("CONFLICT", "Item group has local dependency blockers", {
					reason: "MASTER_DEPENDENCY_BLOCKED",
					blockers: [
						...(hasLiveChild ? ["item_group.child"] : []),
						...(hasLiveItem ? ["item_group.item"] : []),
					],
				} satisfies MasterFailureDetails);
			}
		}
		const snapshot = cloneItemGroup(existing);
		const now = new Date();
		const updated: ItemGroup = {
			...existing,
			status: record.toStatus,
			version: existing.version + 1,
			updatedBy: record.actorUserId,
			updatedAt: now,
			activatedAt:
				record.toStatus === "active"
					? (existing.activatedAt ?? now)
					: existing.activatedAt,
			activatedBy:
				record.toStatus === "active"
					? (existing.activatedBy ?? record.actorUserId)
					: existing.activatedBy,
			retiredAt: record.toStatus === "retired" ? now : null,
			retiredBy: record.toStatus === "retired" ? record.actorUserId : null,
		};
		this.itemGroups.set(updated.id, updated);
		const eventType =
			`master_data.item_group.${meta.eventSuffix}.v1` as MasterDataEventType;
		const sideEffect = await this.commitMutation(
			() => {
				this.itemGroups.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "item_group",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "status",
						oldValue: snapshot.status,
						newValue: updated.status,
					},
				],
				oldValue: { status: snapshot.status, version: snapshot.version },
				newValue: { status: updated.status, version: updated.version },
				type: eventType,
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItemGroup(updated));
	}

	async getItemById(
		organizationId: string,
		id: string,
	): Promise<Result<Item | null>> {
		const row = this.items.get(id);
		if (row === undefined || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneItem(row));
	}

	async getItemByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Item | null>> {
		for (const row of this.items.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null
			) {
				return ok(cloneItem(row));
			}
		}
		return ok(null);
	}

	async listItems(filter: ItemListFilter): Promise<Result<Item[]>> {
		const rows = [...this.items.values()]
			.filter(
				(row) =>
					row.organizationId === filter.organizationId &&
					(filter.status === undefined || row.status === filter.status) &&
					(filter.updatedSince === undefined ||
						row.updatedAt > filter.updatedSince) &&
					(filter.itemGroupId === undefined ||
						row.itemGroupId === filter.itemGroupId),
			)
			.sort((a, b) =>
				a.normalizedCode === b.normalizedCode
					? a.id.localeCompare(b.id)
					: a.normalizedCode.localeCompare(b.normalizedCode),
			);
		return ok(paginate(rows, filter.page, filter.pageSize).map(cloneItem));
	}

	async createItem(
		record: ItemCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Item>> {
		if (this.hasLiveItemCode(record.organizationId, record.normalizedCode)) {
			return fail(
				"CONFLICT",
				"Item code already exists",
				codeConflictDetails(),
			);
		}
		const baseUom = this.uoms.get(record.baseUomId);
		if (baseUom === undefined) {
			return fail("BAD_REQUEST", "baseUomId is not a known platform UoM", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		if (!baseUom.active) {
			return fail(
				"BAD_REQUEST",
				"baseUomId must reference an active platform UoM",
				{
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails,
			);
		}
		const group = this.itemGroups.get(record.itemGroupId);
		if (group === undefined || group.organizationId !== record.organizationId) {
			return fail(
				"BAD_REQUEST",
				"itemGroupId must exist in the same organization",
				{
					reason: "MASTER_CROSS_ORG_REFERENCE",
				} satisfies MasterFailureDetails,
			);
		}
		if (group.status !== "active" || group.retiredAt !== null) {
			return fail(
				"CONFLICT",
				"itemGroupId must reference an active item group",
				{
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails,
			);
		}
		const now = new Date();
		const profile = resolveItemOperationalProfile({
			itemType: record.itemType,
			trackingPolicy: record.trackingPolicy,
			sellable: record.sellable,
			purchasable: record.purchasable,
			stocked: record.stocked,
			serviceIndicator: record.serviceIndicator,
		});
		const item: Item = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			name: record.name,
			description: record.description ?? null,
			itemType: record.itemType,
			baseUomId: record.baseUomId,
			itemGroupId: record.itemGroupId,
			trackingPolicy: profile.trackingPolicy,
			sellable: profile.sellable,
			purchasable: profile.purchasable,
			stocked: profile.stocked,
			serviceIndicator: profile.serviceIndicator,
			status: "draft",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			activatedAt: null,
			activatedBy: null,
			retiredAt: null,
			retiredBy: null,
			createdAt: now,
			updatedAt: now,
		};
		const baseUomRow: ItemUom = {
			id: randomUUID(),
			organizationId: item.organizationId,
			itemId: item.id,
			alternateUomId: item.baseUomId,
			conversionFactor: "1",
			roundingScale: 0,
			isPurchaseUom: false,
			isSalesUom: false,
			isInventoryUom: true,
			isDefaultPurchaseUom: false,
			isDefaultSalesUom: false,
			compatibilityMode: "physical_dimension",
			packagingApprovalReference: null,
			status: "active",
			archivedAt: null,
			archivedBy: null,
			version: 1,
			validFrom: null,
			validTo: null,
			createdBy: item.createdBy,
			updatedBy: item.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(item.id, item);
		this.itemUoms.set(baseUomRow.id, baseUomRow);
		const sideEffect = await this.commitMutation(
			() => {
				this.items.delete(item.id);
				this.itemUoms.delete(baseUomRow.id);
			},
			ports,
			{
				organizationId: item.organizationId,
				actorUserId: item.createdBy,
				correlationId: meta.correlationId,
				entity: "item",
				entityId: item.id,
				action: "CREATE",
				changes: [{ field: "code", oldValue: null, newValue: item.code }],
				newValue: {
					code: item.code,
					description: item.description,
					trackingPolicy: item.trackingPolicy,
					sellable: item.sellable,
					purchasable: item.purchasable,
					stocked: item.stocked,
					serviceIndicator: item.serviceIndicator,
					baseUomId: item.baseUomId,
					itemGroupId: item.itemGroupId,
				},
				type: "master_data.item.created.v1",
				code: item.code,
				version: item.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItem(item));
	}

	async updateItem(
		record: ItemUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Item>> {
		const existing = this.items.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Item belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Item version conflict",
				versionConflictDetails(),
			);
		}
		const nextBaseUomId = record.baseUomId ?? existing.baseUomId;
		const nextGroupId = record.itemGroupId ?? existing.itemGroupId;
		const nextItemType = record.itemType ?? existing.itemType;
		const itemTypeChanged = nextItemType !== existing.itemType;
		const nextProfile = resolveItemOperationalProfile({
			itemType: nextItemType,
			trackingPolicy:
				record.trackingPolicy ??
				(itemTypeChanged ? undefined : existing.trackingPolicy),
			sellable:
				record.sellable ?? (itemTypeChanged ? undefined : existing.sellable),
			purchasable:
				record.purchasable ??
				(itemTypeChanged ? undefined : existing.purchasable),
			stocked:
				record.stocked ?? (itemTypeChanged ? undefined : existing.stocked),
			serviceIndicator:
				record.serviceIndicator ??
				(itemTypeChanged ? undefined : existing.serviceIndicator),
		});
		if (nextBaseUomId !== existing.baseUomId) {
			return fail(
				"CONFLICT",
				"Base UoM changes require a governed item conversion operation",
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
			);
		}
		if (nextItemType !== existing.itemType) {
			const hasMaterialDependencies =
				existing.status !== "draft" ||
				[...this.itemVariants.values()].some(
					(variant) =>
						variant.organizationId === record.organizationId &&
						variant.itemId === record.id &&
						variant.retiredAt === null,
				) ||
				[...this.itemUoms.values()].some(
					(uom) =>
						uom.organizationId === record.organizationId &&
						uom.itemId === record.id &&
						(uom.alternateUomId !== existing.baseUomId ||
							uom.conversionFactor !== "1"),
				) ||
				[...this.itemBarcodes.values()].some(
					(row) =>
						row.organizationId === record.organizationId &&
						row.itemId === record.id,
				) ||
				[...this.itemExternalIds.values()].some(
					(row) =>
						row.organizationId === record.organizationId &&
						row.itemId === record.id,
				) ||
				[...this.itemAliases.values()].some(
					(row) =>
						row.organizationId === record.organizationId &&
						row.itemId === record.id,
				);
			if (hasMaterialDependencies) {
				return fail("CONFLICT", "Item type has material dependency blockers", {
					reason: "MASTER_DEPENDENCY_BLOCKED",
				} satisfies MasterFailureDetails);
			}
		}
		const baseUom = this.uoms.get(nextBaseUomId);
		if (baseUom === undefined) {
			return fail("BAD_REQUEST", "baseUomId is not a known platform UoM", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		if (!baseUom.active) {
			return fail(
				"BAD_REQUEST",
				"baseUomId must reference an active platform UoM",
				{
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails,
			);
		}
		const group = this.itemGroups.get(nextGroupId);
		if (group === undefined || group.organizationId !== record.organizationId) {
			return fail(
				"BAD_REQUEST",
				"itemGroupId must exist in the same organization",
				{
					reason: "MASTER_CROSS_ORG_REFERENCE",
				} satisfies MasterFailureDetails,
			);
		}
		if (group.status !== "active" || group.retiredAt !== null) {
			return fail(
				"CONFLICT",
				"itemGroupId must reference an active item group",
				{
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails,
			);
		}
		const snapshot = cloneItem(existing);
		const updated: Item = {
			...existing,
			name: record.name ?? existing.name,
			description:
				record.description !== undefined
					? record.description
					: existing.description,
			itemType: nextItemType,
			baseUomId: nextBaseUomId,
			itemGroupId: nextGroupId,
			trackingPolicy: nextProfile.trackingPolicy,
			sellable: nextProfile.sellable,
			purchasable: nextProfile.purchasable,
			stocked: nextProfile.stocked,
			serviceIndicator: nextProfile.serviceIndicator,
			version: existing.version + 1,
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		this.items.set(updated.id, updated);
		const sideEffect = await this.commitMutation(
			() => {
				this.items.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "item",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{ field: "name", oldValue: snapshot.name, newValue: updated.name },
					...(snapshot.description !== updated.description
						? [
								{
									field: "description",
									oldValue: snapshot.description,
									newValue: updated.description,
								},
							]
						: []),
					...(snapshot.itemType !== updated.itemType
						? [
								{
									field: "itemType",
									oldValue: snapshot.itemType,
									newValue: updated.itemType,
								},
							]
						: []),
					...(snapshot.itemGroupId !== updated.itemGroupId
						? [
								{
									field: "itemGroupId",
									oldValue: snapshot.itemGroupId,
									newValue: updated.itemGroupId,
								},
							]
						: []),
					...(snapshot.trackingPolicy !== updated.trackingPolicy
						? [
								{
									field: "trackingPolicy",
									oldValue: snapshot.trackingPolicy,
									newValue: updated.trackingPolicy,
								},
							]
						: []),
					...(snapshot.sellable !== updated.sellable
						? [
								{
									field: "sellable",
									oldValue: snapshot.sellable,
									newValue: updated.sellable,
								},
							]
						: []),
					...(snapshot.purchasable !== updated.purchasable
						? [
								{
									field: "purchasable",
									oldValue: snapshot.purchasable,
									newValue: updated.purchasable,
								},
							]
						: []),
					...(snapshot.stocked !== updated.stocked
						? [
								{
									field: "stocked",
									oldValue: snapshot.stocked,
									newValue: updated.stocked,
								},
							]
						: []),
					...(snapshot.serviceIndicator !== updated.serviceIndicator
						? [
								{
									field: "serviceIndicator",
									oldValue: snapshot.serviceIndicator,
									newValue: updated.serviceIndicator,
								},
							]
						: []),
				],
				oldValue: {
					name: snapshot.name,
					description: snapshot.description,
					itemType: snapshot.itemType,
					baseUomId: snapshot.baseUomId,
					itemGroupId: snapshot.itemGroupId,
					trackingPolicy: snapshot.trackingPolicy,
					sellable: snapshot.sellable,
					purchasable: snapshot.purchasable,
					stocked: snapshot.stocked,
					serviceIndicator: snapshot.serviceIndicator,
					version: snapshot.version,
				},
				newValue: {
					name: updated.name,
					description: updated.description,
					itemType: updated.itemType,
					baseUomId: updated.baseUomId,
					itemGroupId: updated.itemGroupId,
					trackingPolicy: updated.trackingPolicy,
					sellable: updated.sellable,
					purchasable: updated.purchasable,
					stocked: updated.stocked,
					serviceIndicator: updated.serviceIndicator,
					version: updated.version,
				},
				type: "master_data.item.updated.v1",
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItem(updated));
	}

	async transitionItem(
		record: ItemLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: ItemLifecycleEventSuffix;
		},
	): Promise<Result<Item>> {
		const existing = this.items.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Item belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Item version conflict",
				versionConflictDetails(),
			);
		}
		const lifecycle =
			record.toStatus === "draft"
				? assertRestoreTransition(existing.status, "draft")
				: assertLifecycleTransition(existing.status, record.toStatus);
		if (!lifecycle.ok) {
			return lifecycle;
		}
		if (record.toStatus === "active") {
			const group = this.itemGroups.get(existing.itemGroupId);
			const baseUom = this.uoms.get(existing.baseUomId);
			if (
				group === undefined ||
				group.organizationId !== record.organizationId ||
				group.status !== "active" ||
				group.retiredAt !== null ||
				baseUom === undefined ||
				!baseUom.active
			) {
				return fail(
					"CONFLICT",
					"Item requires an active item group and active platform UoM",
					{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
				);
			}
		}
		if (record.toStatus === "retired") {
			const hasLocalBlocker =
				[...this.itemUoms.values()].some(
					(uom) =>
						uom.organizationId === record.organizationId &&
						uom.itemId === record.id &&
						(uom.alternateUomId !== existing.baseUomId ||
							uom.conversionFactor !== "1"),
				) ||
				[...this.itemBarcodes.values()].some(
					(row) =>
						row.organizationId === record.organizationId &&
						row.itemId === record.id,
				) ||
				[...this.itemExternalIds.values()].some(
					(row) =>
						row.organizationId === record.organizationId &&
						row.itemId === record.id,
				) ||
				[...this.itemAliases.values()].some(
					(row) =>
						row.organizationId === record.organizationId &&
						row.itemId === record.id,
				);
			if (hasLocalBlocker) {
				return fail("CONFLICT", "Item has local dependency blockers", {
					reason: "MASTER_DEPENDENCY_BLOCKED",
				} satisfies MasterFailureDetails);
			}
		}
		const snapshot = cloneItem(existing);
		const now = new Date();
		const updated: Item = {
			...existing,
			status: record.toStatus,
			version: existing.version + 1,
			updatedBy: record.actorUserId,
			updatedAt: now,
			activatedAt:
				record.toStatus === "active"
					? (existing.activatedAt ?? now)
					: existing.activatedAt,
			activatedBy:
				record.toStatus === "active"
					? (existing.activatedBy ?? record.actorUserId)
					: existing.activatedBy,
			retiredAt: record.toStatus === "retired" ? now : null,
			retiredBy: record.toStatus === "retired" ? record.actorUserId : null,
		};
		this.items.set(updated.id, updated);

		let liveVariant: ItemVariantMembership | null = null;
		let variantSnapshot: ItemVariantMembership | null = null;
		if (record.toStatus === "retired") {
			for (const variant of this.itemVariants.values()) {
				if (
					variant.organizationId === record.organizationId &&
					variant.itemId === record.id &&
					variant.retiredAt === null
				) {
					liveVariant = variant;
					break;
				}
			}
			if (liveVariant !== null) {
				variantSnapshot = { ...liveVariant };
				const retiredVariant: ItemVariantMembership = {
					...liveVariant,
					version: nextExtensionVersion(liveVariant.version),
					updatedBy: record.actorUserId,
					updatedAt: now,
					retiredAt: now,
					retiredBy: record.actorUserId,
				};
				this.itemVariants.set(retiredVariant.id, retiredVariant);
				liveVariant = retiredVariant;
			}
		}

		const eventType =
			`master_data.item.${meta.eventSuffix}.v1` as MasterDataEventType;
		const sideEffect = await this.commitMutation(
			() => {
				this.items.set(snapshot.id, snapshot);
				if (variantSnapshot !== null) {
					this.itemVariants.set(variantSnapshot.id, variantSnapshot);
				}
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "item",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "status",
						oldValue: snapshot.status,
						newValue: updated.status,
					},
				],
				oldValue: { status: snapshot.status, version: snapshot.version },
				newValue: { status: updated.status, version: updated.version },
				type: eventType,
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		if (liveVariant !== null && variantSnapshot !== null) {
			const retired = liveVariant;
			const variantSide = await this.commitMutation(
				() => {
					this.itemVariants.set(variantSnapshot.id, variantSnapshot);
				},
				ports,
				{
					organizationId: retired.organizationId,
					actorUserId: record.actorUserId,
					correlationId: meta.correlationId,
					entity: "item_variant",
					entityId: retired.id,
					action: "UPDATE",
					changes: [
						{
							field: "retiredAt",
							oldValue: null,
							newValue: retired.retiredAt,
						},
					],
					oldValue: { retiredAt: null, version: variantSnapshot.version },
					newValue: {
						retiredAt: retired.retiredAt,
						version: retired.version,
					},
					type: "master_data.item_variant.retired.v1",
					code: retired.combinationKey,
					version: retired.version,
				},
			);
			if (!variantSide.ok) {
				return variantSide;
			}
		}
		return ok(cloneItem(updated));
	}

	async getWarehouseById(
		organizationId: string,
		id: string,
	): Promise<Result<Warehouse | null>> {
		const row = this.warehouses.get(id);
		if (row === undefined || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneWarehouse(row));
	}

	async getWarehouseByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Warehouse | null>> {
		for (const row of this.warehouses.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null
			) {
				return ok(cloneWarehouse(row));
			}
		}
		return ok(null);
	}

	async listWarehouses(filter: ListFilter): Promise<Result<Warehouse[]>> {
		const rows = [...this.warehouses.values()]
			.filter(
				(row) =>
					row.organizationId === filter.organizationId &&
					(filter.status === undefined || row.status === filter.status) &&
					(filter.updatedSince === undefined ||
						row.updatedAt > filter.updatedSince),
			)
			.sort((a, b) =>
				a.normalizedCode === b.normalizedCode
					? a.id.localeCompare(b.id)
					: a.normalizedCode.localeCompare(b.normalizedCode),
			);
		return ok(paginate(rows, filter.page, filter.pageSize).map(cloneWarehouse));
	}

	async createWarehouse(
		record: WarehouseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Warehouse>> {
		if (
			this.hasLiveWarehouseCode(record.organizationId, record.normalizedCode)
		) {
			return fail(
				"CONFLICT",
				"Warehouse code already exists",
				codeConflictDetails(),
			);
		}
		const parentCheck = this.assertParentWarehouse(
			record.organizationId,
			null,
			record.parentId ?? null,
			record.locationType,
		);
		if (!parentCheck.ok) {
			return parentCheck;
		}
		if (
			record.addressCountryId !== undefined &&
			record.addressCountryId !== null
		) {
			const country = this.countries.get(record.addressCountryId);
			if (country === undefined || !country.active) {
				return fail("BAD_REQUEST", "Warehouse address country must be active", {
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails);
			}
		}
		const now = new Date();
		const warehouse: Warehouse = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			name: record.name,
			locationType: record.locationType,
			parentId: record.parentId ?? null,
			addressCountryId: record.addressCountryId ?? null,
			addressLine1: record.addressLine1 ?? null,
			addressLine2: record.addressLine2 ?? null,
			addressCity: record.addressCity ?? null,
			addressRegion: record.addressRegion ?? null,
			addressPostalCode: record.addressPostalCode ?? null,
			status: "draft",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			activatedAt: null,
			activatedBy: null,
			retiredAt: null,
			retiredBy: null,
			createdAt: now,
			updatedAt: now,
		};
		this.warehouses.set(warehouse.id, warehouse);
		const sideEffect = await this.commitMutation(
			() => {
				this.warehouses.delete(warehouse.id);
			},
			ports,
			{
				organizationId: warehouse.organizationId,
				actorUserId: warehouse.createdBy,
				correlationId: meta.correlationId,
				entity: "warehouse",
				entityId: warehouse.id,
				action: "CREATE",
				changes: [{ field: "code", oldValue: null, newValue: warehouse.code }],
				newValue: { code: warehouse.code, status: warehouse.status },
				type: "master_data.warehouse.created.v1",
				code: warehouse.code,
				version: warehouse.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneWarehouse(warehouse));
	}

	async updateWarehouse(
		record: WarehouseUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Warehouse>> {
		const existing = this.warehouses.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Warehouse not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Warehouse belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Warehouse version conflict",
				versionConflictDetails(),
			);
		}
		const snapshot = cloneWarehouse(existing);
		const nextLocationType = record.locationType ?? existing.locationType;
		const nextAddressCountryId =
			record.addressCountryId !== undefined
				? record.addressCountryId
				: existing.addressCountryId;
		if (nextAddressCountryId !== null) {
			const country = this.countries.get(nextAddressCountryId);
			if (country === undefined || !country.active) {
				return fail("BAD_REQUEST", "Warehouse address country must be active", {
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails);
			}
		}
		if (
			nextLocationType !== existing.locationType &&
			existing.status !== "draft"
		) {
			return fail(
				"CONFLICT",
				"Warehouse location type can change only while the warehouse is draft",
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
			);
		}
		if (nextLocationType !== existing.locationType) {
			const parentCheck = this.assertParentWarehouse(
				record.organizationId,
				existing.id,
				existing.parentId,
				nextLocationType,
			);
			if (!parentCheck.ok) return parentCheck;
			const incompatibleChild = [...this.warehouses.values()].some(
				(child) =>
					child.organizationId === record.organizationId &&
					child.parentId === existing.id &&
					!isWarehouseParentTypeCompatible(
						nextLocationType,
						child.locationType,
					),
			);
			const hasExternalId = [...this.warehouseExternalIds.values()].some(
				(row) =>
					row.organizationId === record.organizationId &&
					row.warehouseId === existing.id,
			);
			if (incompatibleChild || hasExternalId) {
				return fail("CONFLICT", "Warehouse type has dependency blockers", {
					reason: "MASTER_DEPENDENCY_BLOCKED",
				} satisfies MasterFailureDetails);
			}
		}
		const updated: Warehouse = {
			...existing,
			name: record.name ?? existing.name,
			locationType: nextLocationType,
			addressCountryId: nextAddressCountryId,
			addressLine1:
				record.addressLine1 !== undefined
					? record.addressLine1
					: existing.addressLine1,
			addressLine2:
				record.addressLine2 !== undefined
					? record.addressLine2
					: existing.addressLine2,
			addressCity:
				record.addressCity !== undefined
					? record.addressCity
					: existing.addressCity,
			addressRegion:
				record.addressRegion !== undefined
					? record.addressRegion
					: existing.addressRegion,
			addressPostalCode:
				record.addressPostalCode !== undefined
					? record.addressPostalCode
					: existing.addressPostalCode,
			version: existing.version + 1,
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		this.warehouses.set(updated.id, updated);
		const sideEffect = await this.commitMutation(
			() => {
				this.warehouses.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "warehouse",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{ field: "name", oldValue: snapshot.name, newValue: updated.name },
				],
				oldValue: { name: snapshot.name, version: snapshot.version },
				newValue: { name: updated.name, version: updated.version },
				type: "master_data.warehouse.updated.v1",
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneWarehouse(updated));
	}

	async moveWarehouse(
		record: WarehouseMoveRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Warehouse>> {
		const existing = this.warehouses.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Warehouse not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Warehouse belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Warehouse version conflict",
				versionConflictDetails(),
			);
		}
		if (existing.status !== "draft" && existing.status !== "inactive") {
			return fail(
				"CONFLICT",
				"Only draft or inactive warehouses may move without governed operational clearance",
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
			);
		}
		const parentCheck = this.assertParentWarehouse(
			record.organizationId,
			existing.id,
			record.parentId,
			existing.locationType,
		);
		if (!parentCheck.ok) {
			return parentCheck;
		}
		const snapshot = cloneWarehouse(existing);
		const updated: Warehouse = {
			...existing,
			parentId: record.parentId,
			version: existing.version + 1,
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		this.warehouses.set(updated.id, updated);
		const sideEffect = await this.commitMutation(
			() => {
				this.warehouses.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "warehouse",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "parentId",
						oldValue: snapshot.parentId,
						newValue: updated.parentId,
					},
				],
				oldValue: { parentId: snapshot.parentId, version: snapshot.version },
				newValue: { parentId: updated.parentId, version: updated.version },
				type: "master_data.warehouse.moved.v1",
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneWarehouse(updated));
	}

	async transitionWarehouse(
		record: WarehouseLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: WarehouseLifecycleEventSuffix;
		},
	): Promise<Result<Warehouse>> {
		const existing = this.warehouses.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Warehouse not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Warehouse belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Warehouse version conflict",
				versionConflictDetails(),
			);
		}
		const lifecycle = assertLifecycleTransition(
			existing.status,
			record.toStatus,
		);
		if (!lifecycle.ok) return lifecycle;
		if (record.toStatus === "active" && existing.parentId !== null) {
			const parent = this.warehouses.get(existing.parentId);
			if (
				parent === undefined ||
				parent.organizationId !== record.organizationId ||
				parent.status !== "active" ||
				parent.retiredAt !== null
			) {
				return fail("CONFLICT", "Warehouse parent must be active", {
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails);
			}
		}
		if (record.toStatus === "retired") {
			const hasLiveChild = [...this.warehouses.values()].some(
				(child) =>
					child.organizationId === record.organizationId &&
					child.parentId === record.id &&
					child.retiredAt === null,
			);
			const hasExternalId = [...this.warehouseExternalIds.values()].some(
				(row) =>
					row.organizationId === record.organizationId &&
					row.warehouseId === record.id,
			);
			if (hasLiveChild || hasExternalId) {
				return fail("CONFLICT", "Warehouse has local dependency blockers", {
					reason: "MASTER_DEPENDENCY_BLOCKED",
				} satisfies MasterFailureDetails);
			}
		}
		const snapshot = cloneWarehouse(existing);
		const now = new Date();
		const updated: Warehouse = {
			...existing,
			status: record.toStatus,
			version: existing.version + 1,
			updatedBy: record.actorUserId,
			updatedAt: now,
			activatedAt:
				record.toStatus === "active"
					? (existing.activatedAt ?? now)
					: existing.activatedAt,
			activatedBy:
				record.toStatus === "active"
					? (existing.activatedBy ?? record.actorUserId)
					: existing.activatedBy,
			retiredAt: record.toStatus === "retired" ? now : null,
			retiredBy: record.toStatus === "retired" ? record.actorUserId : null,
		};
		this.warehouses.set(updated.id, updated);
		const eventType =
			`master_data.warehouse.${meta.eventSuffix}.v1` as MasterDataEventType;
		const sideEffect = await this.commitMutation(
			() => {
				this.warehouses.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "warehouse",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "status",
						oldValue: snapshot.status,
						newValue: updated.status,
					},
				],
				oldValue: { status: snapshot.status, version: snapshot.version },
				newValue: { status: updated.status, version: updated.version },
				type: eventType,
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneWarehouse(updated));
	}

	async getPaymentTermById(
		organizationId: string,
		id: string,
	): Promise<Result<PaymentTerm | null>> {
		const row = this.paymentTerms.get(id);
		if (row === undefined || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(clonePaymentTerm(row));
	}

	async getPaymentTermByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<PaymentTerm | null>> {
		for (const row of this.paymentTerms.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null
			) {
				return ok(clonePaymentTerm(row));
			}
		}
		return ok(null);
	}

	async listPaymentTerms(filter: ListFilter): Promise<Result<PaymentTerm[]>> {
		const rows = [...this.paymentTerms.values()]
			.filter(
				(row) =>
					row.organizationId === filter.organizationId &&
					(filter.status === undefined || row.status === filter.status) &&
					(filter.updatedSince === undefined ||
						row.updatedAt > filter.updatedSince),
			)
			.sort((a, b) =>
				a.normalizedCode === b.normalizedCode
					? a.id.localeCompare(b.id)
					: a.normalizedCode.localeCompare(b.normalizedCode),
			);
		return ok(
			paginate(rows, filter.page, filter.pageSize).map(clonePaymentTerm),
		);
	}

	async createPaymentTerm(
		record: PaymentTermCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PaymentTerm>> {
		const ruleResult = normalizePaymentTermRule(record);
		if (!ruleResult.ok) return ruleResult;
		const rule = ruleResult.data;
		if (rule.currencyRestrictionId !== null) {
			const currency = this.currencies.get(rule.currencyRestrictionId);
			if (currency === undefined || !currency.active) {
				return fail(
					"BAD_REQUEST",
					"Payment term currency restriction must be active",
					{ reason: "MASTER_VALIDATION_FAILED" } satisfies MasterFailureDetails,
				);
			}
		}
		if (
			this.hasLivePaymentTermCode(record.organizationId, record.normalizedCode)
		) {
			return fail(
				"CONFLICT",
				"Payment term code already exists",
				codeConflictDetails(),
			);
		}
		const now = new Date();
		const term: PaymentTerm = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			name: record.name,
			...rule,
			status: "draft",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			activatedAt: null,
			activatedBy: null,
			retiredAt: null,
			retiredBy: null,
			createdAt: now,
			updatedAt: now,
		};
		this.paymentTerms.set(term.id, term);
		const sideEffect = await this.commitMutation(
			() => {
				this.paymentTerms.delete(term.id);
			},
			ports,
			{
				organizationId: term.organizationId,
				actorUserId: term.createdBy,
				correlationId: meta.correlationId,
				entity: "payment_term",
				entityId: term.id,
				action: "CREATE",
				changes: [{ field: "code", oldValue: null, newValue: term.code }],
				newValue: {
					code: term.code,
					netDays: term.netDays,
					status: term.status,
				},
				type: "master_data.payment_term.created.v1",
				code: term.code,
				version: term.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(clonePaymentTerm(term));
	}

	async updatePaymentTerm(
		record: PaymentTermUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PaymentTerm>> {
		const existing = this.paymentTerms.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Payment term not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Payment term belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Payment term version conflict",
				versionConflictDetails(),
			);
		}
		if (existing.status === "retired") {
			return fail("CONFLICT", "Retired payment terms are immutable", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
		}
		const ruleResult = normalizePaymentTermRule({
			netDays: record.netDays ?? existing.netDays,
			discountDays:
				record.discountDays !== undefined
					? record.discountDays
					: existing.discountDays,
			discountPercent:
				record.discountPercent !== undefined
					? record.discountPercent
					: existing.discountPercent,
			dueDayRule: record.dueDayRule ?? existing.dueDayRule,
			endOfMonth: record.endOfMonth ?? existing.endOfMonth,
			installmentPolicy: record.installmentPolicy ?? existing.installmentPolicy,
			installmentCount:
				record.installmentCount !== undefined
					? record.installmentCount
					: existing.installmentCount,
			validFrom:
				record.validFrom !== undefined ? record.validFrom : existing.validFrom,
			validTo: record.validTo !== undefined ? record.validTo : existing.validTo,
			currencyRestrictionId:
				record.currencyRestrictionId !== undefined
					? record.currencyRestrictionId
					: existing.currencyRestrictionId,
		});
		if (!ruleResult.ok) return ruleResult;
		const rule = ruleResult.data;
		if (rule.currencyRestrictionId !== null) {
			const currency = this.currencies.get(rule.currencyRestrictionId);
			if (currency === undefined || !currency.active) {
				return fail(
					"BAD_REQUEST",
					"Payment term currency restriction must be active",
					{ reason: "MASTER_VALIDATION_FAILED" } satisfies MasterFailureDetails,
				);
			}
		}
		const snapshot = clonePaymentTerm(existing);
		const updated: PaymentTerm = {
			...existing,
			name: record.name ?? existing.name,
			...rule,
			version: existing.version + 1,
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		this.paymentTerms.set(updated.id, updated);
		const sideEffect = await this.commitMutation(
			() => {
				this.paymentTerms.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "payment_term",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{ field: "name", oldValue: snapshot.name, newValue: updated.name },
					...(snapshot.netDays !== updated.netDays
						? [
								{
									field: "netDays",
									oldValue: snapshot.netDays,
									newValue: updated.netDays,
								},
							]
						: []),
				],
				oldValue: {
					name: snapshot.name,
					netDays: snapshot.netDays,
					version: snapshot.version,
				},
				newValue: {
					name: updated.name,
					netDays: updated.netDays,
					version: updated.version,
				},
				type: "master_data.payment_term.updated.v1",
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(clonePaymentTerm(updated));
	}

	async transitionPaymentTerm(
		record: PaymentTermLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PaymentTermLifecycleEventSuffix;
		},
	): Promise<Result<PaymentTerm>> {
		const existing = this.paymentTerms.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Payment term not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Payment term belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Payment term version conflict",
				versionConflictDetails(),
			);
		}
		const lifecycle = assertLifecycleTransition(
			existing.status,
			record.toStatus,
		);
		if (!lifecycle.ok) return lifecycle;
		const snapshot = clonePaymentTerm(existing);
		const now = new Date();
		const updated: PaymentTerm = {
			...existing,
			status: record.toStatus,
			version: existing.version + 1,
			updatedBy: record.actorUserId,
			updatedAt: now,
			activatedAt:
				record.toStatus === "active"
					? (existing.activatedAt ?? now)
					: existing.activatedAt,
			activatedBy:
				record.toStatus === "active"
					? (existing.activatedBy ?? record.actorUserId)
					: existing.activatedBy,
			retiredAt: record.toStatus === "retired" ? now : null,
			retiredBy: record.toStatus === "retired" ? record.actorUserId : null,
		};
		this.paymentTerms.set(updated.id, updated);
		const eventType =
			`master_data.payment_term.${meta.eventSuffix}.v1` as MasterDataEventType;
		const sideEffect = await this.commitMutation(
			() => {
				this.paymentTerms.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "payment_term",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "status",
						oldValue: snapshot.status,
						newValue: updated.status,
					},
				],
				oldValue: { status: snapshot.status, version: snapshot.version },
				newValue: { status: updated.status, version: updated.version },
				type: eventType,
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(clonePaymentTerm(updated));
	}

	async getTaxRegistrationById(
		organizationId: string,
		id: string,
	): Promise<Result<TaxRegistration | null>> {
		const row = this.taxRegistrations.get(id);
		if (row === undefined || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneTaxRegistration(row));
	}

	async listTaxRegistrations(
		filter: TaxRegistrationListFilter,
	): Promise<Result<TaxRegistration[]>> {
		const rows = [...this.taxRegistrations.values()]
			.filter(
				(row) =>
					row.organizationId === filter.organizationId &&
					(filter.status === undefined || row.status === filter.status) &&
					(filter.partyId === undefined || row.partyId === filter.partyId) &&
					(filter.updatedSince === undefined ||
						row.updatedAt > filter.updatedSince) &&
					row.deletedAt === null,
			)
			.sort((a, b) =>
				a.normalizedRegistrationNumber === b.normalizedRegistrationNumber
					? a.id.localeCompare(b.id)
					: a.normalizedRegistrationNumber.localeCompare(
							b.normalizedRegistrationNumber,
						),
			);
		return ok(
			paginate(rows, filter.page, filter.pageSize).map(cloneTaxRegistration),
		);
	}

	async findTaxRegistrationsByParty(
		organizationId: string,
		partyId: string,
	): Promise<Result<TaxRegistration[]>> {
		return this.listTaxRegistrations({
			organizationId,
			partyId,
			page: 1,
			pageSize: 100,
		});
	}

	async findOverlappingActiveTaxRegistration(
		query: TaxRegistrationOverlapQuery,
	): Promise<Result<TaxRegistration | null>> {
		for (const row of this.taxRegistrations.values()) {
			if (
				row.organizationId === query.organizationId &&
				row.partyId === query.partyId &&
				row.jurisdictionCountryId === query.jurisdictionCountryId &&
				row.registrationType === query.registrationType &&
				row.status === "active" &&
				row.deletedAt === null &&
				row.id !== query.excludeId &&
				validityRangesOverlap(
					{ validFrom: query.validFrom, validTo: query.validTo },
					{ validFrom: row.validFrom, validTo: row.validTo },
				)
			) {
				return ok(cloneTaxRegistration(row));
			}
		}
		return ok(null);
	}

	async createTaxRegistration(
		record: TaxRegistrationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TaxRegistration>> {
		const party = this.parties.get(record.partyId);
		if (party === undefined || party.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Party not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (party.status === "retired") {
			return fail("CONFLICT", "Party is retired", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
		}
		const country = this.countries.get(record.jurisdictionCountryId);
		if (country === undefined || !country.active) {
			return fail("BAD_REQUEST", "Active jurisdiction country not found", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		if (
			isInvalidValidityRange({
				validFrom: record.validFrom,
				validTo: record.validTo,
			})
		) {
			return fail("BAD_REQUEST", "validTo must be after validFrom", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		if (
			this.hasLiveTaxRegistrationIdentity(
				record.organizationId,
				record.partyId,
				record.jurisdictionCountryId,
				record.registrationType,
				record.normalizedRegistrationNumber,
			)
		) {
			return fail(
				"CONFLICT",
				"Tax registration identity already exists",
				codeConflictDetails(),
			);
		}
		const now = new Date();
		const row: TaxRegistration = {
			id: randomUUID(),
			organizationId: record.organizationId,
			partyId: record.partyId,
			jurisdictionCountryId: record.jurisdictionCountryId,
			registrationType: record.registrationType,
			registrationNumber: record.registrationNumber,
			normalizedRegistrationNumber: record.normalizedRegistrationNumber,
			name: record.name,
			status: "draft",
			version: 1,
			validFrom: record.validFrom,
			validTo: record.validTo,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			activatedAt: null,
			activatedBy: null,
			blockedAt: null,
			blockedBy: null,
			retiredAt: null,
			retiredBy: null,
			deletedAt: null,
			deletedBy: null,
			createdAt: now,
			updatedAt: now,
		};
		this.taxRegistrations.set(row.id, row);
		const sideEffect = await this.commitMutation(
			() => {
				this.taxRegistrations.delete(row.id);
			},
			ports,
			{
				organizationId: row.organizationId,
				actorUserId: row.createdBy,
				correlationId: meta.correlationId,
				entity: "tax_registration",
				entityId: row.id,
				action: "CREATE",
				changes: [
					{
						field: "identity",
						oldValue: null,
						newValue: {
							partyId: row.partyId,
							jurisdictionCountryId: row.jurisdictionCountryId,
							registrationType: row.registrationType,
						},
					},
				],
				newValue: {
					partyId: row.partyId,
					jurisdictionCountryId: row.jurisdictionCountryId,
					registrationType: row.registrationType,
					status: row.status,
				},
				type: "master_data.tax_registration.created.v1",
				code: row.registrationType,
				version: row.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneTaxRegistration(row));
	}

	async updateTaxRegistration(
		record: TaxRegistrationUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TaxRegistration>> {
		const existing = this.taxRegistrations.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Tax registration not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Tax registration belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Tax registration version conflict",
				versionConflictDetails(),
			);
		}
		if (existing.status === "retired") {
			return fail("CONFLICT", "Retired tax registrations are immutable", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
		}
		const nextValidFrom =
			record.validFrom !== undefined ? record.validFrom : existing.validFrom;
		const nextValidTo =
			record.validTo !== undefined ? record.validTo : existing.validTo;
		if (
			isInvalidValidityRange({
				validFrom: nextValidFrom,
				validTo: nextValidTo,
			})
		) {
			return fail("BAD_REQUEST", "validTo must be after validFrom", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		if (existing.status === "active") {
			if (nextValidFrom === null) {
				return fail("CONFLICT", "Active tax registration requires validFrom", {
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails);
			}
			const overlap = await this.findOverlappingActiveTaxRegistration({
				organizationId: existing.organizationId,
				partyId: existing.partyId,
				jurisdictionCountryId: existing.jurisdictionCountryId,
				registrationType: existing.registrationType,
				validFrom: nextValidFrom,
				validTo: nextValidTo,
				excludeId: existing.id,
			});
			if (!overlap.ok) return overlap;
			if (overlap.data !== null) {
				return fail(
					"CONFLICT",
					"Active tax registration validity ranges overlap",
					{ reason: "MASTER_VALIDITY_OVERLAP" } satisfies MasterFailureDetails,
				);
			}
		}
		const snapshot = cloneTaxRegistration(existing);
		const updated: TaxRegistration = {
			...existing,
			name: record.name !== undefined ? record.name : existing.name,
			validFrom: nextValidFrom,
			validTo: nextValidTo,
			version: existing.version + 1,
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		this.taxRegistrations.set(updated.id, updated);
		const sideEffect = await this.commitMutation(
			() => {
				this.taxRegistrations.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "tax_registration",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{ field: "name", oldValue: snapshot.name, newValue: updated.name },
					{
						field: "validFrom",
						oldValue: snapshot.validFrom,
						newValue: updated.validFrom,
					},
					{
						field: "validTo",
						oldValue: snapshot.validTo,
						newValue: updated.validTo,
					},
				],
				oldValue: {
					name: snapshot.name,
					validFrom: snapshot.validFrom,
					validTo: snapshot.validTo,
					version: snapshot.version,
				},
				newValue: {
					name: updated.name,
					validFrom: updated.validFrom,
					validTo: updated.validTo,
					version: updated.version,
				},
				type: "master_data.tax_registration.updated.v1",
				code: updated.registrationType,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneTaxRegistration(updated));
	}

	async transitionTaxRegistration(
		record: TaxRegistrationLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: TaxRegistrationLifecycleEventSuffix;
		},
	): Promise<Result<TaxRegistration>> {
		const existing = this.taxRegistrations.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Tax registration not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Tax registration belongs to another organization",
				crossOrgDetails(),
			);
		}
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Tax registration version conflict",
				versionConflictDetails(),
			);
		}
		const lifecycle =
			existing.status === "retired" && record.toStatus === "blocked"
				? assertRestoreTransition(existing.status, "blocked")
				: assertTaxRegistrationLifecycleTransition(
						existing.status,
						record.toStatus,
					);
		if (!lifecycle.ok) return lifecycle;
		if (record.toStatus === "active") {
			if (existing.validFrom === null) {
				return fail("CONFLICT", "Active tax registration requires validFrom", {
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails);
			}
			if (
				isInvalidValidityRange({
					validFrom: existing.validFrom,
					validTo: existing.validTo,
				})
			) {
				return fail("BAD_REQUEST", "validTo must be after validFrom", {
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails);
			}
			const party = this.parties.get(existing.partyId);
			if (
				party === undefined ||
				party.organizationId !== existing.organizationId ||
				party.status === "retired"
			) {
				return fail("CONFLICT", "Party is unavailable", {
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails);
			}
			const country = this.countries.get(existing.jurisdictionCountryId);
			if (country === undefined || !country.active) {
				return fail("BAD_REQUEST", "Active jurisdiction country not found", {
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails);
			}
			const overlap = await this.findOverlappingActiveTaxRegistration({
				organizationId: existing.organizationId,
				partyId: existing.partyId,
				jurisdictionCountryId: existing.jurisdictionCountryId,
				registrationType: existing.registrationType,
				validFrom: existing.validFrom,
				validTo: existing.validTo,
				excludeId: existing.id,
			});
			if (!overlap.ok) return overlap;
			if (overlap.data !== null) {
				return fail(
					"CONFLICT",
					"Active tax registration validity ranges overlap",
					{ reason: "MASTER_VALIDITY_OVERLAP" } satisfies MasterFailureDetails,
				);
			}
		}
		const snapshot = cloneTaxRegistration(existing);
		const now = new Date();
		const updated: TaxRegistration = {
			...existing,
			status: record.toStatus,
			version: existing.version + 1,
			updatedBy: record.actorUserId,
			updatedAt: now,
			activatedAt:
				record.toStatus === "active"
					? (existing.activatedAt ?? now)
					: existing.activatedAt,
			activatedBy:
				record.toStatus === "active"
					? (existing.activatedBy ?? record.actorUserId)
					: existing.activatedBy,
			blockedAt: record.toStatus === "blocked" ? now : existing.blockedAt,
			blockedBy:
				record.toStatus === "blocked" ? record.actorUserId : existing.blockedBy,
			retiredAt: record.toStatus === "retired" ? now : null,
			retiredBy: record.toStatus === "retired" ? record.actorUserId : null,
		};
		this.taxRegistrations.set(updated.id, updated);
		const eventType =
			`master_data.tax_registration.${meta.eventSuffix}.v1` as MasterDataEventType;
		const sideEffect = await this.commitMutation(
			() => {
				this.taxRegistrations.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "tax_registration",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "status",
						oldValue: snapshot.status,
						newValue: updated.status,
					},
				],
				oldValue: { status: snapshot.status, version: snapshot.version },
				newValue: { status: updated.status, version: updated.version },
				type: eventType,
				code: updated.registrationType,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneTaxRegistration(updated));
	}

	private hasLivePartyCode(
		organizationId: string,
		normalizedCode: string,
	): boolean {
		for (const row of this.parties.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null &&
				row.mergedIntoId === null
			) {
				return true;
			}
		}
		return false;
	}

	private hasLiveItemGroupCode(
		organizationId: string,
		normalizedCode: string,
	): boolean {
		for (const row of this.itemGroups.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null
			) {
				return true;
			}
		}
		return false;
	}

	private hasLiveItemCode(
		organizationId: string,
		normalizedCode: string,
	): boolean {
		for (const row of this.items.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null
			) {
				return true;
			}
		}
		return false;
	}

	private hasLiveWarehouseCode(
		organizationId: string,
		normalizedCode: string,
	): boolean {
		for (const row of this.warehouses.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null
			) {
				return true;
			}
		}
		return false;
	}

	private hasLivePaymentTermCode(
		organizationId: string,
		normalizedCode: string,
	): boolean {
		for (const row of this.paymentTerms.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null
			) {
				return true;
			}
		}
		return false;
	}

	private hasLiveTaxRegistrationIdentity(
		organizationId: string,
		partyId: string,
		jurisdictionCountryId: string,
		registrationType: TaxRegistration["registrationType"],
		normalizedRegistrationNumber: string,
	): boolean {
		for (const row of this.taxRegistrations.values()) {
			if (
				row.organizationId === organizationId &&
				row.partyId === partyId &&
				row.jurisdictionCountryId === jurisdictionCountryId &&
				row.registrationType === registrationType &&
				row.normalizedRegistrationNumber === normalizedRegistrationNumber &&
				row.retiredAt === null &&
				row.deletedAt === null
			) {
				return true;
			}
		}
		return false;
	}

	private hasLiveItemTemplateCode(
		organizationId: string,
		normalizedCode: string,
	): boolean {
		for (const row of this.itemTemplates.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null
			) {
				return true;
			}
		}
		return false;
	}

	private hasTemplateAttributeCode(
		organizationId: string,
		templateId: string,
		normalizedCode: string,
	): boolean {
		for (const row of this.itemTemplateAttributes.values()) {
			if (
				row.organizationId === organizationId &&
				row.templateId === templateId &&
				row.normalizedCode === normalizedCode
			) {
				return true;
			}
		}
		return false;
	}

	private hasTemplateAttributeOptionCode(
		organizationId: string,
		attributeId: string,
		normalizedCode: string,
	): boolean {
		for (const row of this.itemTemplateAttributeOptions.values()) {
			if (
				row.organizationId === organizationId &&
				row.attributeId === attributeId &&
				row.normalizedCode === normalizedCode
			) {
				return true;
			}
		}
		return false;
	}

	private hasLiveCombinationKey(
		organizationId: string,
		templateId: string,
		combinationKey: string,
	): boolean {
		for (const row of this.itemVariants.values()) {
			if (
				row.organizationId === organizationId &&
				row.templateId === templateId &&
				row.combinationKey === combinationKey &&
				row.retiredAt === null
			) {
				return true;
			}
		}
		return false;
	}

	private assembleItemVariant(
		membership: ItemVariantMembership,
	): ItemVariant | null {
		const item = this.items.get(membership.itemId);
		if (
			item === undefined ||
			item.organizationId !== membership.organizationId
		) {
			return null;
		}
		const values = [...this.itemVariantAttributeValues.values()]
			.filter(
				(value) =>
					value.organizationId === membership.organizationId &&
					value.variantId === membership.id,
			)
			.sort((a, b) =>
				a.attributeId === b.attributeId
					? a.id.localeCompare(b.id)
					: a.attributeId.localeCompare(b.attributeId),
			)
			.map(cloneItemVariantAttributeValue);
		return cloneItemVariant({
			...membership,
			item: cloneItem(item),
			values,
		});
	}

	private assertParentItemGroup(
		organizationId: string,
		selfId: string | null,
		parentId: string | null,
	): Result<true> {
		if (parentId === null) {
			return ok(true);
		}
		if (selfId !== null && parentId === selfId) {
			return fail(
				"BAD_REQUEST",
				"Item group cannot parent itself",
				validationDetails(),
			);
		}
		const parent = this.itemGroups.get(parentId);
		if (parent === undefined || parent.organizationId !== organizationId) {
			return fail(
				"CONFLICT",
				"Item group parent must exist in the same organization",
				crossOrgDetails(),
			);
		}
		if (parent.status !== "active" || parent.retiredAt !== null) {
			return fail("CONFLICT", "Item group parent must be active", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
		}
		let cursor: string | null = parent.parentId;
		const seen = new Set<string>([parentId]);
		while (cursor !== null) {
			if (selfId !== null && cursor === selfId) {
				return fail("CONFLICT", "Item group parent would create a cycle", {
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails);
			}
			if (seen.has(cursor)) {
				return fail("CONFLICT", "Item group parent would create a cycle", {
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails);
			}
			seen.add(cursor);
			const next = this.itemGroups.get(cursor);
			if (next === undefined || next.organizationId !== organizationId) {
				return fail(
					"CONFLICT",
					"Item group parent chain crosses organizations",
					crossOrgDetails(),
				);
			}
			cursor = next.parentId;
		}
		return ok(true);
	}

	private assertParentWarehouse(
		organizationId: string,
		selfId: string | null,
		parentId: string | null,
		childLocationType: Warehouse["locationType"],
	): Result<true> {
		if (parentId === null) {
			return ok(true);
		}
		if (selfId !== null && parentId === selfId) {
			return fail(
				"BAD_REQUEST",
				"Warehouse cannot parent itself",
				validationDetails(),
			);
		}
		const parent = this.warehouses.get(parentId);
		if (parent === undefined || parent.organizationId !== organizationId) {
			return fail(
				"CONFLICT",
				"Warehouse parent must exist in the same organization",
				crossOrgDetails(),
			);
		}
		if (parent.status !== "active" || parent.retiredAt !== null) {
			return fail("CONFLICT", "Warehouse parent must be active", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
		}
		if (
			!isWarehouseParentTypeCompatible(parent.locationType, childLocationType)
		) {
			return fail(
				"BAD_REQUEST",
				"Warehouse parent and child location types are incompatible",
				{ reason: "MASTER_VALIDATION_FAILED" } satisfies MasterFailureDetails,
			);
		}
		let cursor: string | null = parent.parentId;
		const seen = new Set<string>([parentId]);
		while (cursor !== null) {
			if (selfId !== null && cursor === selfId) {
				return fail(
					"BAD_REQUEST",
					"Warehouse parent would create a cycle",
					validationDetails(),
				);
			}
			if (seen.has(cursor)) {
				return fail(
					"BAD_REQUEST",
					"Warehouse parent would create a cycle",
					validationDetails(),
				);
			}
			seen.add(cursor);
			const next = this.warehouses.get(cursor);
			if (next === undefined || next.organizationId !== organizationId) {
				return fail(
					"CONFLICT",
					"Warehouse parent chain crosses organizations",
					crossOrgDetails(),
				);
			}
			cursor = next.parentId;
		}
		return ok(true);
	}

	private async commitMutation(
		rollback: () => void,
		ports: MutationPorts,
		input: {
			organizationId: string;
			actorUserId: string;
			correlationId: string;
			entity: string;
			entityId: string;
			action: "CREATE" | "UPDATE" | "DELETE";
			changes: { field: string; oldValue: unknown; newValue: unknown }[];
			oldValue?: Record<string, unknown>;
			newValue?: Record<string, unknown>;
			type: MasterDataEventType;
			code: string;
			version: number;
			eventPayload?: ExtensionEventPayload;
		},
	): Promise<Result<true>> {
		const auditResult = await ports.audit.record({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			entity: input.entity,
			entityId: input.entityId,
			action: input.action,
			changes: input.changes,
			oldValue: input.oldValue ?? null,
			newValue: input.newValue ?? null,
		});
		if (!auditResult.ok) {
			rollback();
			return auditResult;
		}
		const outboxResult = await ports.outbox.append({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			type: input.type,
			payload: input.eventPayload ?? {
				organizationId: input.organizationId,
				entityType: input.entity,
				entityId: input.entityId,
				code: input.code,
				version: input.version,
				actorId: input.actorUserId,
				correlationId: input.correlationId,
			},
		});
		if (!outboxResult.ok) {
			rollback();
			return outboxResult;
		}
		return ok(true);
	}

	/** Object-form wrapper used by extension mutations. */
	private async commitSideEffects(input: {
		ports: MutationPorts;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
		code: string;
		version: number;
		type: MasterDataEventType;
		rollback: () => void;
		eventPayload?: ExtensionEventPayload;
		changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
		newValue?: Record<string, unknown>;
	}): Promise<Result<true>> {
		return this.commitMutation(input.rollback, input.ports, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			entity: input.entity,
			entityId: input.entityId,
			action: input.action,
			changes: input.changes ?? [
				{ field: "id", oldValue: null, newValue: input.entityId },
			],
			newValue: input.newValue ?? { code: input.code },
			type: input.type,
			code: input.code,
			version: input.version,
			eventPayload: input.eventPayload,
		});
	}

	async countActivePartyRoles(
		organizationId: string,
		partyId: string,
	): Promise<Result<number>> {
		let count = 0;
		for (const role of this.partyRoles.values()) {
			if (
				role.organizationId === organizationId &&
				role.partyId === partyId &&
				role.status === "active" &&
				role.archivedAt === null
			) {
				count += 1;
			}
		}
		return ok(count);
	}

	async listPartyRoles(
		filter: PartyRoleListFilter,
	): Promise<Result<ExtensionListPage<PartyRole>>> {
		const rows = [...this.partyRoles.values()]
			.filter(
				(r) =>
					r.organizationId === filter.organizationId &&
					r.partyId === filter.partyId,
			)
			.sort((a, b) => a.roleCode.localeCompare(b.roleCode));
		return ok({
			items: paginate(rows, filter.page, filter.pageSize).map((r) => ({
				...r,
			})),
			page: filter.page,
			pageSize: filter.pageSize,
			hasNextPage: rows.length > filter.page * filter.pageSize,
		});
	}

	async listActivePartyRoles(
		filter: PartyRoleListFilter,
	): Promise<Result<ExtensionListPage<PartyRole>>> {
		const rows = [...this.partyRoles.values()]
			.filter(
				(role) =>
					role.organizationId === filter.organizationId &&
					role.partyId === filter.partyId &&
					role.status === "active" &&
					role.archivedAt === null,
			)
			.sort((a, b) => a.roleCode.localeCompare(b.roleCode));
		return ok({
			items: paginate(rows, filter.page, filter.pageSize).map((role) => ({
				...role,
			})),
			page: filter.page,
			pageSize: filter.pageSize,
			hasNextPage: rows.length > filter.page * filter.pageSize,
		});
	}

	async getPartyRoleById(
		organizationId: string,
		partyId: string,
		id: string,
	): Promise<Result<PartyRole | null>> {
		const role = this.partyRoles.get(id);
		return ok(
			role?.organizationId === organizationId && role.partyId === partyId
				? { ...role }
				: null,
		);
	}

	async getPartyRoleLifecycleContext(
		organizationId: string,
		id: string,
	): Promise<
		Result<{
			role: PartyRole | null;
			party: Party | null;
			activeRoleCount: number;
		}>
	> {
		const role = this.partyRoles.get(id);
		if (role === undefined || role.organizationId !== organizationId) {
			return ok({ role: null, party: null, activeRoleCount: 0 });
		}
		const party = this.parties.get(role.partyId);
		const activeRoleCount = await this.countActivePartyRoles(
			organizationId,
			role.partyId,
		);
		if (!activeRoleCount.ok) return activeRoleCount;
		return ok({
			role: { ...role },
			party:
				party?.organizationId === organizationId
					? {
							...party,
						}
					: null,
			activeRoleCount: activeRoleCount.data,
		});
	}

	async createPartyRole(
		record: PartyRoleCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyRole>> {
		const party = this.parties.get(record.partyId);
		if (!party || party.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Party not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		const now = new Date();
		const role: PartyRole = {
			id: randomUUID(),
			organizationId: record.organizationId,
			partyId: record.partyId,
			roleCode: record.roleCode,
			status: "draft",
			version: 1,
			validFrom: record.validFrom ?? null,
			validTo: record.validTo ?? null,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			activatedAt: null,
			activatedBy: null,
			retiredAt: null,
			retiredBy: null,
			archivedAt: null,
			archivedBy: null,
			createdAt: now,
			updatedAt: now,
		};
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "party_role",
			entityId: role.id,
			action: "CREATE",
			code: record.roleCode,
			version: 1,
			type: EXTENSION_EVENT_TYPES.partyRoleCreated,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "party_role",
				entityId: role.id,
				parentEntityId: record.partyId,
				classification: extensionEventClassification(
					"party_role",
					record.roleCode,
				),
				version: 1,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => this.partyRoles.delete(role.id),
		});
		if (!side.ok) return side;
		this.partyRoles.set(role.id, role);
		return ok({ ...role });
	}

	async updatePartyRole(
		record: PartyRoleUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyRole>> {
		const role = this.partyRoles.get(record.id);
		if (!role || role.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Party role not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		const version = assertExpectedExtensionVersion(
			role,
			record.expectedVersion,
			"party_role",
		);
		if (!version.ok) return version;
		if (role.status !== "draft" && role.status !== "inactive") {
			return fail(
				"CONFLICT",
				"Only draft or inactive party roles can be updated",
				{
					reason: "MASTER_INVALID_STATE",
				},
			);
		}
		const next: PartyRole = {
			...role,
			roleCode: record.roleCode ?? role.roleCode,
			validFrom:
				record.validFrom !== undefined ? record.validFrom : role.validFrom,
			validTo: record.validTo !== undefined ? record.validTo : role.validTo,
			version: nextExtensionVersion(role.version),
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		if (
			next.validFrom !== null &&
			next.validTo !== null &&
			next.validTo < next.validFrom
		) {
			return fail("BAD_REQUEST", "validTo must not precede validFrom", {
				reason: "MASTER_VALIDATION_FAILED",
			});
		}
		const previous = { ...role };
		this.partyRoles.set(role.id, next);
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.updatedBy,
			correlationId: meta.correlationId,
			entity: "party_role",
			entityId: role.id,
			action: "UPDATE",
			code: next.roleCode,
			version: next.version,
			type: EXTENSION_EVENT_TYPES.partyRoleUpdated,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "party_role",
				entityId: role.id,
				parentEntityId: role.partyId,
				classification: extensionEventClassification(
					"party_role",
					next.roleCode,
				),
				version: next.version,
				actorId: record.updatedBy,
				correlationId: meta.correlationId,
			}),
			changes: [
				{ field: "roleCode", oldValue: role.roleCode, newValue: next.roleCode },
			],
			newValue: { roleCode: next.roleCode },
			rollback: () => this.partyRoles.set(role.id, previous),
		});
		if (!side.ok) return side;
		return ok({ ...next });
	}

	async transitionPartyRole(
		record: PartyRoleLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PartyRoleLifecycleEventSuffix;
		},
	): Promise<Result<PartyRole>> {
		const role = this.partyRoles.get(record.id);
		if (!role || role.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Party role not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		const version = assertExpectedExtensionVersion(
			role,
			record.expectedVersion,
			"party_role",
		);
		if (!version.ok) return version;
		const transition = resolveExtensionLifecycleTransition(
			"party_role",
			assertStandardChildLifecycleStatus(role.status),
			record.toStatus,
		);
		if (!transition.ok) return transition;
		const reason = assertExtensionTransitionReason(
			transition.data,
			record.reason,
		);
		if (!reason.ok) return reason;
		if (
			record.toStatus === "active" &&
			[...this.partyRoles.values()].some(
				(sibling) =>
					sibling.id !== role.id &&
					sibling.organizationId === role.organizationId &&
					sibling.partyId === role.partyId &&
					sibling.roleCode === role.roleCode &&
					sibling.status === "active" &&
					sibling.archivedAt === null,
			)
		) {
			return fail(
				"CONFLICT",
				"An active party role of this type already exists",
				codeConflictDetails(),
			);
		}
		const party = this.parties.get(role.partyId);
		if (
			party === undefined ||
			party.organizationId !== record.organizationId ||
			party.status === "retired" ||
			party.mergedIntoId !== null
		) {
			return fail("CONFLICT", "Party cannot accept extension transitions", {
				reason: "MASTER_INVALID_STATE",
			});
		}
		if (
			transition.data.parentStateRequirement === "parent_active" &&
			party.status !== "active"
		) {
			return fail("CONFLICT", "Party must be active for this transition", {
				reason: "MASTER_INVALID_STATE",
			});
		}
		// Active party cannot lose its final active role (reverse of activation invariant).
		if (
			record.toStatus !== "active" &&
			role.status === "active" &&
			role.archivedAt === null
		) {
			if (
				party?.organizationId === record.organizationId &&
				party.status === "active"
			) {
				const activeCount = await this.countActivePartyRoles(
					record.organizationId,
					role.partyId,
				);
				if (!activeCount.ok) {
					return activeCount;
				}
				if (activeCount.data <= 1) {
					return fail(
						"CONFLICT",
						"An active party cannot lose its final active role",
						{
							reason: "MASTER_FINAL_ACTIVE_ROLE",
						},
					);
				}
			}
		}
		const next: PartyRole = {
			...role,
			status: record.toStatus,
			version: nextExtensionVersion(role.version),
			updatedBy: record.actorUserId,
			updatedAt: new Date(),
			activatedAt: record.toStatus === "active" ? new Date() : role.activatedAt,
			activatedBy:
				record.toStatus === "active" ? record.actorUserId : role.activatedBy,
			retiredAt: record.toStatus === "retired" ? new Date() : role.retiredAt,
			retiredBy:
				record.toStatus === "retired" ? record.actorUserId : role.retiredBy,
			archivedAt: record.toStatus === "archived" ? new Date() : role.archivedAt,
			archivedBy:
				record.toStatus === "archived" ? record.actorUserId : role.archivedBy,
		};
		const prev = { ...role };
		this.partyRoles.set(role.id, next);
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "party_role",
			entityId: role.id,
			action: "UPDATE",
			code: role.roleCode,
			version: next.version,
			type: partyRoleLifecycleEventType(
				meta.eventSuffix,
			) as MasterDataEventType,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "party_role",
				entityId: role.id,
				parentEntityId: role.partyId,
				classification: extensionEventClassification(
					"party_role",
					role.roleCode,
				),
				version: next.version,
				actorId: record.actorUserId,
				correlationId: meta.correlationId,
			}),
			changes: [
				{ field: "status", oldValue: role.status, newValue: next.status },
			],
			newValue: { status: next.status, reason: reason.data },
			rollback: () => this.partyRoles.set(role.id, prev),
		});
		if (!side.ok) return side;
		return ok({ ...next });
	}

	async listPartyAddresses(
		filter: ParentListFilter,
	): Promise<Result<PartyAddress[]>> {
		const rows = [...this.partyAddresses.values()]
			.filter(
				(r) =>
					r.organizationId === filter.organizationId &&
					r.partyId === filter.parentId,
			)
			.sort((a, b) => a.line1.localeCompare(b.line1));
		return ok(
			paginate(rows, filter.page, filter.pageSize).map((r) => ({ ...r })),
		);
	}

	async getPartyAddressById(
		organizationId: string,
		partyId: string,
		id: string,
	): Promise<Result<PartyAddress | null>> {
		const row = this.partyAddresses.get(id);
		if (
			!row ||
			row.organizationId !== organizationId ||
			row.partyId !== partyId
		) {
			return ok(null);
		}
		return ok({ ...row });
	}

	async getPrimaryPartyAddress(
		organizationId: string,
		partyId: string,
		purpose: PartyAddress["purpose"],
	): Promise<Result<PartyAddress | null>> {
		const row = [...this.partyAddresses.values()].find(
			(address) =>
				address.organizationId === organizationId &&
				address.partyId === partyId &&
				address.purpose === purpose &&
				address.isPrimary &&
				address.status === "active" &&
				address.archivedAt === null,
		);
		return ok(row ? { ...row } : null);
	}

	async createPartyAddress(
		record: PartyAddressCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyAddress>> {
		const party = this.parties.get(record.partyId);
		if (!party || party.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Party not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		if (
			party.status === "retired" ||
			party.retiredAt !== null ||
			party.mergedIntoId !== null
		) {
			return fail("CONFLICT", "Party cannot accept extension mutations", {
				reason: "MASTER_INVALID_STATE",
			});
		}
		const country = this.countries.get(record.countryId);
		if (!country) {
			return fail("BAD_REQUEST", "Referenced country does not exist", {
				reason: "MASTER_VALIDATION_FAILED",
			});
		}
		if (!country.active) {
			return fail(
				"CONFLICT",
				"New active addresses require an active country",
				{
					reason: "MASTER_INVALID_STATE",
				},
			);
		}
		if (
			record.effectiveFrom != null &&
			record.effectiveTo != null &&
			record.effectiveFrom > record.effectiveTo
		) {
			return fail(
				"BAD_REQUEST",
				"Invalid effective date range",
				validationDetails(),
			);
		}
		const now = new Date();
		const row: PartyAddress = {
			id: randomUUID(),
			organizationId: record.organizationId,
			partyId: record.partyId,
			addressType: record.addressType,
			purpose: record.purpose,
			line1: record.line1,
			line2: record.line2 ?? null,
			line3: record.line3 ?? null,
			city: record.city,
			administrativeArea: record.administrativeArea ?? null,
			postalCode: record.postalCode ?? null,
			countryId: record.countryId,
			attention: record.attention ?? null,
			isPrimary: record.isPrimary ?? false,
			validationStatus: record.validationStatus ?? "unvalidated",
			effectiveFrom: record.effectiveFrom ?? null,
			effectiveTo: record.effectiveTo ?? null,
			status: "active",
			archivedAt: null,
			archivedBy: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const demoted = row.isPrimary
			? [...this.partyAddresses.values()].find(
					(address) =>
						address.organizationId === row.organizationId &&
						address.partyId === row.partyId &&
						address.purpose === row.purpose &&
						address.status === "active" &&
						address.archivedAt === null &&
						address.isPrimary,
				)
			: undefined;
		const previousPrimary = demoted ? { ...demoted } : undefined;
		if (demoted) {
			this.partyAddresses.set(demoted.id, {
				...demoted,
				isPrimary: false,
				version: demoted.version + 1,
				updatedBy: record.createdBy,
				updatedAt: now,
			});
		}
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "party_address",
			entityId: row.id,
			action: "CREATE",
			code: record.addressType,
			version: 1,
			type: EXTENSION_EVENT_TYPES.partyAddressCreated,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "party_address",
				entityId: row.id,
				parentEntityId: record.partyId,
				classification: extensionEventClassification(
					"party_address",
					record.addressType,
				),
				version: 1,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => {
				this.partyAddresses.delete(row.id);
				if (previousPrimary) {
					this.partyAddresses.set(previousPrimary.id, previousPrimary);
				}
			},
		});
		if (!side.ok) return side;
		this.partyAddresses.set(row.id, row);
		return ok({ ...row });
	}

	async updatePartyAddress(
		record: PartyAddressUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyAddress>> {
		const row = this.partyAddresses.get(record.id);
		if (!row || row.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Party address not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		const version = assertExpectedExtensionVersion(
			row,
			record.expectedVersion,
			"party_address",
		);
		if (!version.ok) return version;
		const party = this.parties.get(row.partyId);
		if (
			!party ||
			party.organizationId !== record.organizationId ||
			party.status === "retired" ||
			party.retiredAt !== null ||
			party.mergedIntoId !== null
		) {
			return fail("CONFLICT", "Party cannot accept extension mutations", {
				reason: "MASTER_INVALID_STATE",
			});
		}
		const next: PartyAddress = {
			...row,
			addressType: record.addressType ?? row.addressType,
			purpose: record.purpose ?? row.purpose,
			line1: record.line1 ?? row.line1,
			line2: record.line2 !== undefined ? record.line2 : row.line2,
			line3: record.line3 !== undefined ? record.line3 : row.line3,
			city: record.city ?? row.city,
			administrativeArea:
				record.administrativeArea !== undefined
					? record.administrativeArea
					: row.administrativeArea,
			postalCode:
				record.postalCode !== undefined ? record.postalCode : row.postalCode,
			countryId: record.countryId ?? row.countryId,
			attention:
				record.attention !== undefined ? record.attention : row.attention,
			isPrimary: record.isPrimary ?? row.isPrimary,
			validationStatus: record.validationStatus ?? row.validationStatus,
			effectiveFrom:
				record.effectiveFrom !== undefined
					? record.effectiveFrom
					: row.effectiveFrom,
			effectiveTo:
				record.effectiveTo !== undefined ? record.effectiveTo : row.effectiveTo,
			version: nextExtensionVersion(row.version),
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		const country = this.countries.get(next.countryId);
		if (!country) {
			return fail(
				"BAD_REQUEST",
				"Referenced country does not exist",
				validationDetails(),
			);
		}
		if (!country.active) {
			return fail(
				"CONFLICT",
				"New active addresses require an active country",
				{
					reason: "MASTER_INVALID_STATE",
				},
			);
		}
		if (
			next.effectiveFrom !== null &&
			next.effectiveTo !== null &&
			next.effectiveFrom > next.effectiveTo
		) {
			return fail(
				"BAD_REQUEST",
				"Invalid effective date range",
				validationDetails(),
			);
		}
		const prev = { ...row };
		const demoted = next.isPrimary
			? [...this.partyAddresses.values()].find(
					(address) =>
						address.id !== next.id &&
						address.organizationId === next.organizationId &&
						address.partyId === next.partyId &&
						address.purpose === next.purpose &&
						address.status === "active" &&
						address.archivedAt === null &&
						address.isPrimary,
				)
			: undefined;
		const previousPrimary = demoted ? { ...demoted } : undefined;
		if (demoted) {
			this.partyAddresses.set(demoted.id, {
				...demoted,
				isPrimary: false,
				version: demoted.version + 1,
				updatedBy: record.updatedBy,
				updatedAt: next.updatedAt,
			});
		}
		this.partyAddresses.set(row.id, next);
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.updatedBy,
			correlationId: meta.correlationId,
			entity: "party_address",
			entityId: row.id,
			action: "UPDATE",
			code: next.addressType,
			version: next.version,
			type: EXTENSION_EVENT_TYPES.partyAddressUpdated,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "party_address",
				entityId: row.id,
				parentEntityId: row.partyId,
				classification: extensionEventClassification(
					"party_address",
					next.addressType,
				),
				version: next.version,
				actorId: record.updatedBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => {
				this.partyAddresses.set(row.id, prev);
				if (previousPrimary) {
					this.partyAddresses.set(previousPrimary.id, previousPrimary);
				}
			},
		});
		if (!side.ok) return side;
		return ok({ ...next });
	}

	async listPartyContacts(
		filter: ParentListFilter,
	): Promise<Result<PartyContact[]>> {
		const rows = [...this.partyContacts.values()]
			.filter(
				(r) =>
					r.organizationId === filter.organizationId &&
					r.partyId === filter.parentId,
			)
			.sort((a, b) => a.value.localeCompare(b.value));
		return ok(
			paginate(rows, filter.page, filter.pageSize).map((r) => ({ ...r })),
		);
	}

	async getPrimaryPartyContact(
		organizationId: string,
		partyId: string,
		contactType: PartyContact["contactType"],
		purpose: string | null,
	): Promise<Result<PartyContact | null>> {
		const row = [...this.partyContacts.values()].find(
			(contact) =>
				contact.organizationId === organizationId &&
				contact.partyId === partyId &&
				contact.contactType === contactType &&
				contact.purpose === purpose &&
				contact.isPrimary &&
				contact.status === "active" &&
				contact.archivedAt === null,
		);
		return ok(row ? { ...row } : null);
	}

	async createPartyContact(
		record: PartyContactCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyContact>> {
		const party = this.parties.get(record.partyId);
		if (!party || party.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Party not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		if (
			party.status === "retired" ||
			party.retiredAt !== null ||
			party.mergedIntoId !== null
		) {
			return fail("CONFLICT", "Party cannot accept extension mutations", {
				reason: "MASTER_INVALID_STATE",
			});
		}
		if (
			record.effectiveFrom != null &&
			record.effectiveTo != null &&
			record.effectiveFrom > record.effectiveTo
		) {
			return fail(
				"BAD_REQUEST",
				"Invalid effective date range",
				validationDetails(),
			);
		}
		const now = new Date();
		const row: PartyContact = {
			id: randomUUID(),
			organizationId: record.organizationId,
			partyId: record.partyId,
			contactType: record.contactType,
			value: record.value,
			normalizedValue: record.normalizedValue,
			label: record.label ?? null,
			purpose: record.purpose ?? null,
			isPrimary: record.isPrimary ?? false,
			verificationStatus: "unverified",
			verifiedAt: null,
			effectiveFrom: record.effectiveFrom ?? null,
			effectiveTo: record.effectiveTo ?? null,
			status: "active",
			archivedAt: null,
			archivedBy: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const demoted = row.isPrimary
			? [...this.partyContacts.values()].find(
					(contact) =>
						contact.organizationId === row.organizationId &&
						contact.partyId === row.partyId &&
						contact.contactType === row.contactType &&
						contact.purpose === row.purpose &&
						contact.status === "active" &&
						contact.archivedAt === null &&
						contact.isPrimary,
				)
			: undefined;
		const previousPrimary = demoted ? { ...demoted } : undefined;
		if (demoted) {
			this.partyContacts.set(demoted.id, {
				...demoted,
				isPrimary: false,
				version: demoted.version + 1,
				updatedBy: record.createdBy,
				updatedAt: now,
			});
		}
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "party_contact",
			entityId: row.id,
			action: "CREATE",
			code: record.contactType,
			version: 1,
			type: EXTENSION_EVENT_TYPES.partyContactCreated,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "party_contact",
				entityId: row.id,
				parentEntityId: record.partyId,
				classification: extensionEventClassification(
					"party_contact",
					record.contactType,
				),
				version: 1,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => {
				this.partyContacts.delete(row.id);
				if (previousPrimary) {
					this.partyContacts.set(previousPrimary.id, previousPrimary);
				}
			},
		});
		if (!side.ok) return side;
		this.partyContacts.set(row.id, row);
		return ok({ ...row });
	}

	async updatePartyContact(
		record: PartyContactUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyContact>> {
		const row = this.partyContacts.get(record.id);
		if (!row || row.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Party contact not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		const version = assertExpectedExtensionVersion(
			row,
			record.expectedVersion,
			"party_contact",
		);
		if (!version.ok) return version;
		if (
			(record.contactType === undefined) !== (record.value === undefined) ||
			(record.value === undefined) !== (record.normalizedValue === undefined)
		) {
			return fail(
				"BAD_REQUEST",
				"Contact type, value, and normalized value must change together",
				validationDetails(),
			);
		}
		if (
			record.verificationStatus !== undefined &&
			((record.verificationStatus === "verified" &&
				record.verifiedAt == null) ||
				(record.verificationStatus !== "verified" && record.verifiedAt != null))
		) {
			return fail(
				"BAD_REQUEST",
				"Invalid party contact verification evidence",
				validationDetails(),
			);
		}
		const party = this.parties.get(row.partyId);
		if (
			!party ||
			party.organizationId !== record.organizationId ||
			party.status === "retired" ||
			party.retiredAt !== null ||
			party.mergedIntoId !== null
		) {
			return fail("CONFLICT", "Party cannot accept extension mutations", {
				reason: "MASTER_INVALID_STATE",
			});
		}
		const contactIdentityChanged =
			record.contactType !== undefined || record.value !== undefined;
		const next: PartyContact = {
			...row,
			contactType: record.contactType ?? row.contactType,
			value: record.value ?? row.value,
			normalizedValue: record.normalizedValue ?? row.normalizedValue,
			label: record.label !== undefined ? record.label : row.label,
			purpose: record.purpose !== undefined ? record.purpose : row.purpose,
			isPrimary: record.isPrimary ?? row.isPrimary,
			verificationStatus: contactIdentityChanged
				? "unverified"
				: (record.verificationStatus ?? row.verificationStatus),
			verifiedAt: contactIdentityChanged
				? null
				: record.verificationStatus !== undefined
					? (record.verifiedAt ?? null)
					: row.verifiedAt,
			effectiveFrom:
				record.effectiveFrom !== undefined
					? record.effectiveFrom
					: row.effectiveFrom,
			effectiveTo:
				record.effectiveTo !== undefined ? record.effectiveTo : row.effectiveTo,
			version: nextExtensionVersion(row.version),
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		if (
			next.effectiveFrom !== null &&
			next.effectiveTo !== null &&
			next.effectiveFrom > next.effectiveTo
		) {
			return fail(
				"BAD_REQUEST",
				"Invalid effective date range",
				validationDetails(),
			);
		}
		const prev = { ...row };
		const demoted = next.isPrimary
			? [...this.partyContacts.values()].find(
					(contact) =>
						contact.id !== next.id &&
						contact.organizationId === next.organizationId &&
						contact.partyId === next.partyId &&
						contact.contactType === next.contactType &&
						contact.purpose === next.purpose &&
						contact.status === "active" &&
						contact.archivedAt === null &&
						contact.isPrimary,
				)
			: undefined;
		const previousPrimary = demoted ? { ...demoted } : undefined;
		if (demoted) {
			this.partyContacts.set(demoted.id, {
				...demoted,
				isPrimary: false,
				version: demoted.version + 1,
				updatedBy: record.updatedBy,
				updatedAt: next.updatedAt,
			});
		}
		this.partyContacts.set(row.id, next);
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.updatedBy,
			correlationId: meta.correlationId,
			entity: "party_contact",
			entityId: row.id,
			action: "UPDATE",
			code: next.contactType,
			version: next.version,
			type: EXTENSION_EVENT_TYPES.partyContactUpdated,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "party_contact",
				entityId: row.id,
				parentEntityId: row.partyId,
				classification: extensionEventClassification(
					"party_contact",
					next.contactType,
				),
				version: next.version,
				actorId: record.updatedBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => {
				this.partyContacts.set(row.id, prev);
				if (previousPrimary) {
					this.partyContacts.set(previousPrimary.id, previousPrimary);
				}
			},
		});
		if (!side.ok) return side;
		return ok({ ...next });
	}

	async updatePartyContactVerification(
		record: PartyContactVerificationRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyContact>> {
		return this.updatePartyContact(record, ports, meta);
	}

	async createPartyExternalId(
		record: PartyExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyExternalId>> {
		const party = this.parties.get(record.partyId);
		if (!party || party.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Party not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		for (const existing of this.partyExternalIds.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.status === "active" &&
				existing.sourceSystem === record.sourceSystem &&
				existing.externalIdType === record.externalIdType &&
				existing.normalizedValue === record.normalizedValue
			) {
				return fail("CONFLICT", "External id already exists", {
					reason: "MASTER_EXTERNAL_ID_CONFLICT",
				});
			}
		}
		const now = new Date();
		let previousPrimary: PartyExternalId | null = null;
		if (record.isPrimary) {
			for (const existing of this.partyExternalIds.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.partyId === record.partyId &&
					existing.sourceSystem === record.sourceSystem &&
					existing.externalIdType === record.externalIdType &&
					existing.isPrimary &&
					existing.status === "active"
				) {
					previousPrimary = { ...existing };
					this.partyExternalIds.set(existing.id, {
						...existing,
						isPrimary: false,
						version: existing.version + 1,
						updatedBy: record.createdBy,
						updatedAt: now,
					});
				}
			}
		}
		const row: PartyExternalId = {
			id: randomUUID(),
			organizationId: record.organizationId,
			partyId: record.partyId,
			sourceSystem: record.sourceSystem,
			externalIdType: record.externalIdType,
			externalValue: record.externalValue,
			normalizedValue: record.normalizedValue,
			caseSensitivity: record.caseSensitivity,
			isPrimary: record.isPrimary,
			status: "active",
			version: 1,
			archivedAt: null,
			archivedBy: null,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "party_external_id",
			entityId: row.id,
			action: "CREATE",
			code: `${record.sourceSystem}:${record.externalIdType}`,
			version: 1,
			type: EXTENSION_EVENT_TYPES.partyExternalIdAssigned,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "party_external_id",
				entityId: row.id,
				parentEntityId: record.partyId,
				classification: extensionEventClassification(
					"party_external_id",
					`${record.sourceSystem}:${record.externalIdType}`,
				),
				version: 1,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => {
				this.partyExternalIds.delete(row.id);
				if (previousPrimary) {
					this.partyExternalIds.set(previousPrimary.id, previousPrimary);
				}
			},
		});
		if (!side.ok) return side;
		this.partyExternalIds.set(row.id, row);
		return ok({ ...row });
	}

	async findPartyByExternalId(
		filter: PartyExternalIdLookup,
	): Promise<Result<Party | null>> {
		const matches: PartyExternalId[] = [];
		for (const ext of this.partyExternalIds.values()) {
			if (
				ext.organizationId === filter.organizationId &&
				ext.status === "active" &&
				ext.archivedAt === null &&
				ext.sourceSystem === filter.sourceSystem &&
				ext.externalIdType === filter.externalIdType &&
				ext.normalizedValue === filter.normalizedValue &&
				ext.caseSensitivity === filter.caseSensitivity
			) {
				matches.push(ext);
			}
		}
		if (matches.length === 0) return ok(null);
		if (matches.length > 1) {
			return fail("CONFLICT", "External id resolves to multiple parties", {
				reason: "MASTER_EXTERNAL_ID_CONFLICT",
			});
		}
		const party = this.parties.get(matches[0].partyId);
		return ok(party ? cloneParty(party) : null);
	}

	async createPartyRelationship(
		record: PartyRelationshipCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyRelationship>> {
		if (record.sourcePartyId === record.targetPartyId) {
			return fail("BAD_REQUEST", "Party relationship cannot be reflexive", {
				reason: "MASTER_VALIDATION_FAILED",
			});
		}
		const from = this.parties.get(record.sourcePartyId);
		const to = this.parties.get(record.targetPartyId);
		if (
			!from ||
			!to ||
			from.organizationId !== record.organizationId ||
			to.organizationId !== record.organizationId ||
			from.status === "retired" ||
			to.status === "retired" ||
			from.mergedIntoId !== null ||
			to.mergedIntoId !== null
		) {
			return fail(
				"CONFLICT",
				"Parties must exist in the same organization",
				crossOrgDetails(),
			);
		}
		for (const existing of this.partyRelationships.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.sourcePartyId === record.sourcePartyId &&
				existing.targetPartyId === record.targetPartyId &&
				existing.relationshipType === record.relationshipType &&
				existing.status === "active"
			) {
				return fail(
					"CONFLICT",
					"Relationship already exists",
					codeConflictDetails(),
				);
			}
		}
		if (
			record.direction === "hierarchical" &&
			hasPartyParentPath(
				[...this.partyRelationships.values()].filter(
					(
						relationship,
					): relationship is PartyRelationship & {
						relationshipType: "parent_of";
					} =>
						relationship.organizationId === record.organizationId &&
						relationship.relationshipType === "parent_of" &&
						relationship.status === "active",
				),
				record.targetPartyId,
				record.sourcePartyId,
			)
		) {
			return fail("CONFLICT", "Party relationship would create a cycle", {
				reason: "MASTER_RELATIONSHIP_CYCLE",
			});
		}
		const now = new Date();
		const row: PartyRelationship = {
			id: randomUUID(),
			organizationId: record.organizationId,
			sourcePartyId: record.sourcePartyId,
			targetPartyId: record.targetPartyId,
			relationshipType: record.relationshipType,
			direction: record.direction,
			status: "active",
			version: 1,
			effectiveFrom: record.effectiveFrom,
			effectiveTo: record.effectiveTo,
			archivedAt: null,
			archivedBy: null,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "party_relationship",
			entityId: row.id,
			action: "CREATE",
			code: record.relationshipType,
			version: 1,
			type: EXTENSION_EVENT_TYPES.partyRelationshipCreated,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "party_relationship",
				entityId: row.id,
				parentEntityId: record.sourcePartyId,
				classification: extensionEventClassification(
					"party_relationship",
					record.relationshipType,
				),
				version: 1,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => this.partyRelationships.delete(row.id),
		});
		if (!side.ok) return side;
		this.partyRelationships.set(row.id, row);
		return ok({ ...row });
	}

	async listPartyRelationships(
		filter: PartyRelationshipListFilter,
	): Promise<Result<ExtensionListPage<PartyRelationship>>> {
		const rows = [...this.partyRelationships.values()]
			.filter(
				(relationship) =>
					relationship.organizationId === filter.organizationId &&
					(relationship.sourcePartyId === filter.partyId ||
						relationship.targetPartyId === filter.partyId),
			)
			.sort(
				(left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
			);
		return ok({
			items: paginate(rows, filter.page, filter.pageSize).map((row) => ({
				...row,
			})),
			page: filter.page,
			pageSize: filter.pageSize,
			hasNextPage: rows.length > filter.page * filter.pageSize,
		});
	}

	async resolveItemUomCompatibilityContext(
		filter: ItemUomCompatibilityContextFilter,
	): Promise<Result<ItemUomCompatibilityContext>> {
		const item = this.items.get(filter.itemId);
		if (
			!item ||
			item.organizationId !== filter.organizationId ||
			item.status === "retired"
		) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		if (filter.alternateUomId === item.baseUomId) {
			return fail("BAD_REQUEST", "Item UoM conversion duplicates base UoM", {
				reason: "MASTER_INVALID_UOM_CONVERSION",
				field: "alternateUomId",
			});
		}
		const baseUom = this.uoms.get(item.baseUomId);
		const altUom = this.uoms.get(filter.alternateUomId);
		if (!baseUom || !altUom) {
			return fail("BAD_REQUEST", "UoM not found", {
				reason: "MASTER_VALIDATION_FAILED",
				field: "alternateUomId",
			});
		}
		if (!baseUom.active || !altUom.active) {
			return fail("BAD_REQUEST", "UoM must be active", {
				reason: "MASTER_VALIDATION_FAILED",
				field: "alternateUomId",
			});
		}
		const baseDimension = this.dimensions.get(baseUom.dimensionId);
		const alternateDimension = this.dimensions.get(altUom.dimensionId);
		if (!baseDimension || !alternateDimension) {
			return fail("BAD_REQUEST", "UoM dimension not found", {
				reason: "MASTER_VALIDATION_FAILED",
				field: "alternateUomId",
			});
		}
		return ok({
			itemId: item.id,
			baseUomId: item.baseUomId,
			alternateUomId: filter.alternateUomId,
			baseDimensionCode: baseDimension.code,
			alternateDimensionCode: alternateDimension.code,
		});
	}

	async listItemUoms(
		filter: ItemUomListFilter,
	): Promise<Result<ExtensionListPage<ItemUom>>> {
		const rows = [...this.itemUoms.values()]
			.filter(
				(r) =>
					r.organizationId === filter.organizationId &&
					r.itemId === filter.itemId,
			)
			.sort((a, b) => a.alternateUomId.localeCompare(b.alternateUomId));
		return ok(
			pageResult(
				rows.map((r) => ({ ...r })),
				filter.page,
				filter.pageSize,
			),
		);
	}

	async getDefaultItemSalesUom(
		filter: ItemUomDefaultFilter,
	): Promise<Result<ItemUom | null>> {
		const row = [...this.itemUoms.values()].find(
			(uom) =>
				uom.organizationId === filter.organizationId &&
				uom.itemId === filter.itemId &&
				uom.isDefaultSalesUom &&
				uom.status === "active" &&
				uom.archivedAt === null,
		);
		return ok(row ? { ...row } : null);
	}

	async getDefaultItemPurchaseUom(
		filter: ItemUomDefaultFilter,
	): Promise<Result<ItemUom | null>> {
		const row = [...this.itemUoms.values()].find(
			(uom) =>
				uom.organizationId === filter.organizationId &&
				uom.itemId === filter.itemId &&
				uom.isDefaultPurchaseUom &&
				uom.status === "active" &&
				uom.archivedAt === null,
		);
		return ok(row ? { ...row } : null);
	}

	async createItemUom(
		record: ItemUomCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemUom>> {
		const item = this.items.get(record.itemId);
		if (!item || item.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		const baseUom = this.uoms.get(item.baseUomId);
		const altUom = this.uoms.get(record.alternateUomId);
		if (!baseUom || !altUom) {
			return fail("BAD_REQUEST", "UoM not found", {
				reason: "MASTER_VALIDATION_FAILED",
			});
		}
		if (!baseUom.active || !altUom.active) {
			return fail("BAD_REQUEST", "UoM must be active", {
				reason: "MASTER_VALIDATION_FAILED",
			});
		}
		if (record.alternateUomId === item.baseUomId) {
			return fail("BAD_REQUEST", "Item UoM conversion duplicates base UoM", {
				reason: "MASTER_INVALID_UOM_CONVERSION",
				field: "alternateUomId",
			});
		}
		const factor = normalizeItemUomConversionFactor(record.conversionFactor);
		if (!factor.ok) return factor;
		if (record.alternateUomId === item.baseUomId && factor.data !== "1") {
			return fail("BAD_REQUEST", "Base UoM conversion factor must equal 1", {
				reason: "MASTER_INVALID_UOM_CONVERSION",
			});
		}
		const baseDimension = this.dimensions.get(baseUom.dimensionId);
		const alternateDimension = this.dimensions.get(altUom.dimensionId);
		if (!baseDimension || !alternateDimension) {
			return fail("BAD_REQUEST", "UoM dimension not found", {
				reason: "MASTER_VALIDATION_FAILED",
			});
		}
		const compatible = assertItemUomCompatibility({
			baseDimensionCode: baseDimension.code,
			alternateDimensionCode: alternateDimension.code,
			compatibilityMode: record.compatibilityMode,
			packagingApprovalReference: record.packagingApprovalReference,
		});
		if (!compatible.ok) return compatible;
		if (
			(record.isDefaultPurchaseUom && !record.isPurchaseUom) ||
			(record.isDefaultSalesUom && !record.isSalesUom)
		) {
			return fail("BAD_REQUEST", "Default UoM usage is inconsistent", {
				reason: "MASTER_INVALID_UOM_CONVERSION",
			});
		}
		for (const existing of this.itemUoms.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.itemId === record.itemId &&
				existing.alternateUomId === record.alternateUomId &&
				existing.status === "active"
			) {
				return fail("CONFLICT", "Item UoM conversion already exists", {
					reason: "MASTER_DUPLICATE",
				});
			}
		}
		const now = new Date();
		const previousDefaults: ItemUom[] = [];
		for (const existing of this.itemUoms.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.itemId === record.itemId &&
				existing.status === "active" &&
				((record.isDefaultPurchaseUom && existing.isDefaultPurchaseUom) ||
					(record.isDefaultSalesUom && existing.isDefaultSalesUom))
			) {
				previousDefaults.push({ ...existing });
				this.itemUoms.set(existing.id, {
					...existing,
					isDefaultPurchaseUom: record.isDefaultPurchaseUom
						? false
						: existing.isDefaultPurchaseUom,
					isDefaultSalesUom: record.isDefaultSalesUom
						? false
						: existing.isDefaultSalesUom,
					version: existing.version + 1,
					updatedBy: record.createdBy,
					updatedAt: now,
				});
			}
		}
		const row: ItemUom = {
			id: randomUUID(),
			organizationId: record.organizationId,
			itemId: record.itemId,
			alternateUomId: record.alternateUomId,
			conversionFactor: factor.data,
			roundingScale: record.roundingScale,
			isPurchaseUom: record.isPurchaseUom,
			isSalesUom: record.isSalesUom,
			isInventoryUom: record.isInventoryUom,
			isDefaultPurchaseUom: record.isDefaultPurchaseUom,
			isDefaultSalesUom: record.isDefaultSalesUom,
			compatibilityMode: record.compatibilityMode,
			packagingApprovalReference: record.packagingApprovalReference,
			status: "active",
			version: 1,
			validFrom: null,
			validTo: null,
			archivedAt: null,
			archivedBy: null,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "item_uom",
			entityId: row.id,
			action: "CREATE",
			code: record.alternateUomId,
			version: 1,
			type: EXTENSION_EVENT_TYPES.itemUomCreated,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "item_uom",
				entityId: row.id,
				parentEntityId: record.itemId,
				classification: extensionEventClassification(
					"item_uom",
					record.alternateUomId,
				),
				version: 1,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => {
				this.itemUoms.delete(row.id);
				for (const previous of previousDefaults) {
					this.itemUoms.set(previous.id, previous);
				}
			},
		});
		if (!side.ok) return side;
		this.itemUoms.set(row.id, row);
		return ok({ ...row });
	}

	async createItemBarcode(
		record: ItemBarcodeCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemBarcode>> {
		const item = this.items.get(record.itemId);
		if (
			!item ||
			item.organizationId !== record.organizationId ||
			item.status === "retired"
		) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		const normalized = normalizeBarcode({
			rawValue: record.barcodeValue,
			symbology: record.symbology,
		});
		if (!normalized.ok) return normalized;
		const packQuantity =
			record.packQuantity === null
				? null
				: normalizeBarcodePackQuantity(record.packQuantity);
		if (packQuantity !== null && !packQuantity.ok) return packQuantity;
		if ((record.uomId === null) !== (packQuantity === null)) {
			return fail("BAD_REQUEST", "Invalid barcode packaging", {
				reason: "MASTER_INVALID_BARCODE",
			});
		}
		if (record.uomId !== null) {
			const uom = this.uoms.get(record.uomId);
			const usableForItem =
				uom?.active === true &&
				(record.uomId === item.baseUomId ||
					[...this.itemUoms.values()].some(
						(conversion) =>
							conversion.organizationId === record.organizationId &&
							conversion.itemId === record.itemId &&
							conversion.alternateUomId === record.uomId &&
							conversion.status === "active" &&
							conversion.archivedAt === null,
					));
			if (!usableForItem) {
				return fail("BAD_REQUEST", "Barcode UoM is not valid for the item", {
					reason: "MASTER_INVALID_BARCODE",
				});
			}
		}
		for (const existing of this.itemBarcodes.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.symbology === record.symbology &&
				existing.normalizedValue === normalized.data.normalizedValue
			) {
				return fail(
					"CONFLICT",
					"Barcode already exists",
					codeConflictDetails(),
				);
			}
		}
		const previousPrimaries: ItemBarcode[] = [];
		if (record.isPrimary) {
			for (const existing of this.itemBarcodes.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.itemId === record.itemId &&
					isSameNullablePrimaryScope(existing.uomId, record.uomId) &&
					existing.isPrimary &&
					existing.status === "active" &&
					existing.archivedAt === null
				) {
					previousPrimaries.push({ ...existing });
					this.itemBarcodes.set(existing.id, {
						...existing,
						isPrimary: false,
						version: existing.version + 1,
						updatedBy: record.createdBy,
						updatedAt: new Date(),
					});
				}
			}
		}
		const now = new Date();
		const row: ItemBarcode = {
			id: randomUUID(),
			organizationId: record.organizationId,
			itemId: record.itemId,
			barcodeValue: normalized.data.barcodeValue,
			normalizedValue: normalized.data.normalizedValue,
			symbology: record.symbology,
			uomId: record.uomId,
			packQuantity: packQuantity?.data ?? null,
			isPrimary: record.isPrimary,
			status: "active",
			archivedAt: null,
			archivedBy: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "item_barcode",
			entityId: row.id,
			action: "CREATE",
			code: record.symbology,
			version: 1,
			type: EXTENSION_EVENT_TYPES.itemBarcodeAssigned,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "item_barcode",
				entityId: row.id,
				parentEntityId: record.itemId,
				classification: extensionEventClassification(
					"item_barcode",
					record.symbology,
				),
				version: 1,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => {
				this.itemBarcodes.delete(row.id);
				for (const previous of previousPrimaries) {
					this.itemBarcodes.set(previous.id, previous);
				}
			},
		});
		if (!side.ok) return side;
		this.itemBarcodes.set(row.id, row);
		return ok({ ...row });
	}

	async findItemByBarcode(
		filter: ItemBarcodeLookup,
	): Promise<Result<Item | null>> {
		const matches = [...this.itemBarcodes.values()].filter(
			(row) =>
				row.organizationId === filter.organizationId &&
				row.symbology === filter.symbology &&
				row.normalizedValue === filter.normalizedValue &&
				(filter.includeArchived ||
					(row.status === "active" && row.archivedAt === null)),
		);
		if (matches.length > 1) {
			return fail("CONFLICT", "Barcode resolves to multiple items", {
				reason: "MASTER_DUPLICATE",
				candidateCount: matches.length,
			});
		}
		const barcode = matches[0];
		if (barcode === undefined) return ok(null);
		const item = this.items.get(barcode.itemId);
		return ok(item === undefined ? null : { ...item });
	}

	async createItemExternalId(
		record: ItemExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemExternalId>> {
		const item = this.items.get(record.itemId);
		if (
			!item ||
			item.organizationId !== record.organizationId ||
			item.status === "retired"
		) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		const normalized = normalizeExternalId(record);
		if (!normalized.ok) return normalized;
		for (const existing of this.itemExternalIds.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.sourceSystem === normalized.data.sourceSystem &&
				existing.externalIdType === normalized.data.externalIdType &&
				existing.normalizedValue === normalized.data.normalizedValue &&
				existing.status === "active" &&
				existing.archivedAt === null
			) {
				return fail(
					"CONFLICT",
					"External ID already exists",
					codeConflictDetails(),
				);
			}
		}
		const previousPrimaries: ItemExternalId[] = [];
		if (record.isPrimary) {
			for (const existing of this.itemExternalIds.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.itemId === record.itemId &&
					existing.sourceSystem === normalized.data.sourceSystem &&
					existing.externalIdType === normalized.data.externalIdType &&
					existing.isPrimary &&
					existing.status === "active" &&
					existing.archivedAt === null
				) {
					previousPrimaries.push({ ...existing });
					this.itemExternalIds.set(existing.id, {
						...existing,
						isPrimary: false,
						version: existing.version + 1,
						updatedBy: record.createdBy,
						updatedAt: new Date(),
					});
				}
			}
		}
		const now = new Date();
		const row: ItemExternalId = {
			id: randomUUID(),
			organizationId: record.organizationId,
			itemId: record.itemId,
			sourceSystem: normalized.data.sourceSystem,
			externalIdType: normalized.data.externalIdType,
			externalValue: normalized.data.externalValue,
			normalizedValue: normalized.data.normalizedValue,
			caseSensitivity: normalized.data.caseSensitivity,
			isPrimary: record.isPrimary,
			status: "active",
			archivedAt: null,
			archivedBy: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "item_external_id",
			entityId: row.id,
			action: "CREATE",
			code: `${normalized.data.sourceSystem}:${normalized.data.externalIdType}`,
			version: 1,
			type: EXTENSION_EVENT_TYPES.itemExternalIdAssigned,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "item_external_id",
				entityId: row.id,
				parentEntityId: record.itemId,
				classification: extensionEventClassification(
					"item_external_id",
					`${normalized.data.sourceSystem}:${normalized.data.externalIdType}`,
				),
				version: 1,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => {
				this.itemExternalIds.delete(row.id);
				for (const previous of previousPrimaries) {
					this.itemExternalIds.set(previous.id, previous);
				}
			},
		});
		if (!side.ok) return side;
		this.itemExternalIds.set(row.id, row);
		return ok({ ...row });
	}

	async findItemByExternalId(
		filter: ItemExternalIdLookup,
	): Promise<Result<Item | null>> {
		const matches = [...this.itemExternalIds.values()].filter(
			(ext) =>
				ext.organizationId === filter.organizationId &&
				ext.sourceSystem === filter.sourceSystem &&
				ext.externalIdType === filter.externalIdType &&
				ext.normalizedValue === filter.normalizedValue &&
				ext.caseSensitivity === filter.caseSensitivity &&
				ext.status === "active" &&
				ext.archivedAt === null,
		);
		if (matches.length > 1) {
			return fail("CONFLICT", "External id resolves to multiple items", {
				reason: "MASTER_DUPLICATE",
				candidateCount: matches.length,
			});
		}
		const ext = matches[0];
		if (ext === undefined) return ok(null);
		const item = this.items.get(ext.itemId);
		return ok(item ? cloneItem(item) : null);
	}

	async createItemAlias(
		record: ItemAliasCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemAlias>> {
		const item = this.items.get(record.itemId);
		if (
			!item ||
			item.organizationId !== record.organizationId ||
			item.status === "retired"
		) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		const normalized = normalizeItemAlias(record.aliasValue);
		if (!normalized.ok) return normalized;
		const source = normalizeItemAliasSource(record.source);
		if (!source.ok) return source;
		if (record.languageId !== null) {
			const language = this.languages.get(record.languageId);
			if (language?.active !== true) {
				return fail("BAD_REQUEST", "Alias language is not active", {
					reason: "MASTER_VALIDATION_FAILED",
				});
			}
		}
		const now = new Date();
		const row: ItemAlias = {
			id: randomUUID(),
			organizationId: record.organizationId,
			itemId: record.itemId,
			aliasType: record.aliasType,
			aliasValue: normalized.data.aliasValue,
			normalizedValue: normalized.data.normalizedValue,
			languageId: record.languageId,
			source: source.data,
			isSearchable: record.isSearchable,
			status: "active",
			archivedAt: null,
			archivedBy: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "item_alias",
			entityId: row.id,
			action: "CREATE",
			code: record.aliasType,
			version: 1,
			type: EXTENSION_EVENT_TYPES.itemAliasCreated,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "item_alias",
				entityId: row.id,
				parentEntityId: record.itemId,
				classification: extensionEventClassification(
					"item_alias",
					record.aliasType,
				),
				version: 1,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => this.itemAliases.delete(row.id),
		});
		if (!side.ok) return side;
		this.itemAliases.set(row.id, row);
		return ok({ ...row });
	}

	async listItemAliases(
		filter: ItemAliasListFilter,
	): Promise<Result<ExtensionListPage<ItemAlias>>> {
		const rows = [...this.itemAliases.values()]
			.filter(
				(alias) =>
					alias.organizationId === filter.organizationId &&
					alias.itemId === filter.itemId,
			)
			.sort((left, right) => left.aliasValue.localeCompare(right.aliasValue));
		return ok(
			pageResult(
				rows.map((row) => ({ ...row })),
				filter.page,
				filter.pageSize,
			),
		);
	}

	async listItemsByAlias(
		filter: ItemAliasSearchFilter,
	): Promise<Result<ExtensionListPage<Item>>> {
		const matches = new Map<string, Item>();
		for (const alias of this.itemAliases.values()) {
			if (
				alias.organizationId === filter.organizationId &&
				alias.normalizedValue === filter.normalizedValue &&
				alias.isSearchable &&
				alias.status === "active" &&
				alias.archivedAt === null &&
				(filter.aliasType === undefined ||
					alias.aliasType === filter.aliasType) &&
				(filter.languageId === undefined ||
					alias.languageId === filter.languageId)
			) {
				const item = this.items.get(alias.itemId);
				if (
					item !== undefined &&
					item.status === "active" &&
					item.retiredAt === null
				) {
					matches.set(item.id, cloneItem(item));
				}
			}
		}
		const items = [...matches.values()].sort((left, right) => {
			const codeOrder = left.code.localeCompare(right.code);
			return codeOrder === 0 ? left.id.localeCompare(right.id) : codeOrder;
		});
		return ok(pageResult(items, filter.page, filter.pageSize));
	}

	async findItemByAlias(filter: ItemAliasLookup): Promise<Result<Item | null>> {
		const matches = await this.listItemsByAlias({
			...filter,
			page: 1,
			pageSize: 2,
		});
		if (!matches.ok) return matches;
		if (matches.data.items.length > 1) {
			return fail("CONFLICT", "Alias resolves to multiple active items", {
				reason: "MASTER_DUPLICATE",
				candidateCount: matches.data.items.length,
			});
		}
		return ok(matches.data.items[0] ?? null);
	}

	async createWarehouseExternalId(
		record: WarehouseExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WarehouseExternalId>> {
		const warehouse = this.warehouses.get(record.warehouseId);
		if (!warehouse || warehouse.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Warehouse not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		if (warehouse.status === "retired" || warehouse.retiredAt !== null) {
			return fail("CONFLICT", "Retired warehouse cannot receive identifiers", {
				reason: "MASTER_INVALID_STATE",
			});
		}
		for (const existing of this.warehouseExternalIds.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.sourceSystem === record.sourceSystem &&
				existing.externalIdType === record.externalIdType &&
				existing.normalizedValue === record.normalizedValue &&
				existing.status === "active" &&
				existing.archivedAt === null
			) {
				return fail(
					"CONFLICT",
					"External id already exists",
					codeConflictDetails(),
				);
			}
		}
		const now = new Date();
		const row: WarehouseExternalId = {
			id: randomUUID(),
			organizationId: record.organizationId,
			warehouseId: record.warehouseId,
			sourceSystem: record.sourceSystem,
			externalIdType: record.externalIdType,
			externalValue: record.externalValue,
			normalizedValue: record.normalizedValue,
			caseSensitivity: record.caseSensitivity,
			status: "active",
			archivedAt: null,
			archivedBy: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const side = await this.commitSideEffects({
			ports,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "warehouse_external_id",
			entityId: row.id,
			action: "CREATE",
			code: `${record.sourceSystem}:${record.externalIdType}`,
			version: 1,
			type: EXTENSION_EVENT_TYPES.warehouseExternalIdAssigned,
			eventPayload: createExtensionEventPayload({
				organizationId: record.organizationId,
				entityType: "warehouse_external_id",
				entityId: row.id,
				parentEntityId: record.warehouseId,
				classification: extensionEventClassification(
					"warehouse_external_id",
					`${record.sourceSystem}:${record.externalIdType}`,
				),
				version: 1,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			}),
			rollback: () => this.warehouseExternalIds.delete(row.id),
		});
		if (!side.ok) return side;
		this.warehouseExternalIds.set(row.id, row);
		return ok({ ...row });
	}

	async findWarehouseByExternalId(
		organizationId: string,
		sourceSystem: string,
		externalIdType: string,
		normalizedValue: string,
	): Promise<Result<Warehouse | null>> {
		const matches: WarehouseExternalId[] = [];
		for (const ext of this.warehouseExternalIds.values()) {
			if (
				ext.organizationId === organizationId &&
				ext.sourceSystem === sourceSystem &&
				ext.externalIdType === externalIdType &&
				ext.normalizedValue === normalizedValue &&
				ext.status === "active" &&
				ext.archivedAt === null
			) {
				matches.push(ext);
			}
		}
		if (matches.length > 1) {
			return fail("CONFLICT", "External ID resolves to multiple warehouses", {
				reason: "MASTER_EXTERNAL_ID_CONFLICT",
				candidateCount: matches.length,
			});
		}
		const ext = matches[0];
		if (ext === undefined) return ok(null);
		const warehouse = this.warehouses.get(ext.warehouseId);
		return ok(
			warehouse?.status === "active" && warehouse.retiredAt === null
				? cloneWarehouse(warehouse)
				: null,
		);
	}

	async getItemTemplateById(
		organizationId: string,
		id: string,
	): Promise<Result<ItemTemplate | null>> {
		const row = this.itemTemplates.get(id);
		if (row === undefined || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneItemTemplate(row));
	}

	async getItemTemplateByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<ItemTemplate | null>> {
		for (const row of this.itemTemplates.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode &&
				row.retiredAt === null
			) {
				return ok(cloneItemTemplate(row));
			}
		}
		return ok(null);
	}

	async listItemTemplates(filter: ListFilter): Promise<Result<ItemTemplate[]>> {
		const rows = [...this.itemTemplates.values()]
			.filter(
				(row) =>
					row.organizationId === filter.organizationId &&
					(filter.status === undefined || row.status === filter.status),
			)
			.sort((a, b) =>
				a.normalizedCode === b.normalizedCode
					? a.id.localeCompare(b.id)
					: a.normalizedCode.localeCompare(b.normalizedCode),
			);
		return ok(
			paginate(rows, filter.page, filter.pageSize).map(cloneItemTemplate),
		);
	}

	async createItemTemplate(
		record: ItemTemplateCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemTemplate>> {
		if (
			this.hasLiveItemTemplateCode(record.organizationId, record.normalizedCode)
		) {
			return fail(
				"CONFLICT",
				"Item template code already exists",
				codeConflictDetails(),
			);
		}
		const now = new Date();
		const template: ItemTemplate = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			name: record.name,
			status: "draft",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			activatedAt: null,
			activatedBy: null,
			retiredAt: null,
			retiredBy: null,
			createdAt: now,
			updatedAt: now,
		};
		this.itemTemplates.set(template.id, template);
		const sideEffect = await this.commitMutation(
			() => {
				this.itemTemplates.delete(template.id);
			},
			ports,
			{
				organizationId: template.organizationId,
				actorUserId: template.createdBy,
				correlationId: meta.correlationId,
				entity: "item_template",
				entityId: template.id,
				action: "CREATE",
				changes: [{ field: "code", oldValue: null, newValue: template.code }],
				newValue: { code: template.code, status: template.status },
				type: "master_data.item_template.created.v1",
				code: template.code,
				version: template.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItemTemplate(template));
	}

	async updateItemTemplate(
		record: ItemTemplateUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemTemplate>> {
		const existing = this.itemTemplates.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Item template belongs to another organization",
				crossOrgDetails(),
			);
		}
		const version = assertExpectedExtensionVersion(
			existing,
			record.expectedVersion,
			"item_template",
		);
		if (!version.ok) return version;
		const snapshot = cloneItemTemplate(existing);
		const updated: ItemTemplate = {
			...existing,
			name: record.name ?? existing.name,
			version: nextExtensionVersion(existing.version),
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		this.itemTemplates.set(updated.id, updated);
		const sideEffect = await this.commitMutation(
			() => {
				this.itemTemplates.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "item_template",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{ field: "name", oldValue: snapshot.name, newValue: updated.name },
				],
				oldValue: { name: snapshot.name, version: snapshot.version },
				newValue: { name: updated.name, version: updated.version },
				type: "master_data.item_template.updated.v1",
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItemTemplate(updated));
	}

	async transitionItemTemplate(
		record: ItemTemplateLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: ItemTemplateLifecycleEventSuffix;
		},
	): Promise<Result<ItemTemplate>> {
		const existing = this.itemTemplates.get(record.id);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"Item template belongs to another organization",
				crossOrgDetails(),
			);
		}
		const version = assertExpectedExtensionVersion(
			existing,
			record.expectedVersion,
			"item_template",
		);
		if (!version.ok) return version;
		const lifecycle = assertLifecycleTransition(
			existing.status,
			record.toStatus,
		);
		if (!lifecycle.ok) {
			return lifecycle;
		}
		if (record.toStatus === "active") {
			const attributes = [...this.itemTemplateAttributes.values()].filter(
				(attribute) =>
					attribute.organizationId === record.organizationId &&
					attribute.templateId === record.id &&
					attribute.status === "active" &&
					attribute.archivedAt === null,
			);
			const incomplete =
				attributes.length === 0 ||
				!attributes.some((attribute) => attribute.isVariantDefining) ||
				attributes.some(
					(attribute) =>
						(attribute.dataType === "single_option" ||
							attribute.dataType === "multiple_option") &&
						![...this.itemTemplateAttributeOptions.values()].some(
							(option) =>
								option.organizationId === record.organizationId &&
								option.attributeId === attribute.id &&
								option.status === "active" &&
								option.archivedAt === null,
						),
				);
			if (incomplete) {
				return fail("CONFLICT", "Item template structure is incomplete", {
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails);
			}
		}
		if (
			record.toStatus === "retired" &&
			[...this.itemVariants.values()].some(
				(variant) =>
					variant.organizationId === record.organizationId &&
					variant.templateId === record.id &&
					variant.retiredAt === null,
			)
		) {
			return fail("CONFLICT", "Item template has live variants", {
				reason: "MASTER_DEPENDENCY_BLOCKED",
			} satisfies MasterFailureDetails);
		}
		const snapshot = cloneItemTemplate(existing);
		const now = new Date();
		const updated: ItemTemplate = {
			...existing,
			status: record.toStatus,
			version: nextExtensionVersion(existing.version),
			updatedBy: record.actorUserId,
			updatedAt: now,
			activatedAt:
				record.toStatus === "active"
					? (existing.activatedAt ?? now)
					: existing.activatedAt,
			activatedBy:
				record.toStatus === "active"
					? (existing.activatedBy ?? record.actorUserId)
					: existing.activatedBy,
			retiredAt: record.toStatus === "retired" ? now : null,
			retiredBy: record.toStatus === "retired" ? record.actorUserId : null,
		};
		this.itemTemplates.set(updated.id, updated);
		const eventType =
			`master_data.item_template.${meta.eventSuffix}.v1` as MasterDataEventType;
		const sideEffect = await this.commitMutation(
			() => {
				this.itemTemplates.set(snapshot.id, snapshot);
			},
			ports,
			{
				organizationId: updated.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "item_template",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "status",
						oldValue: snapshot.status,
						newValue: updated.status,
					},
				],
				oldValue: { status: snapshot.status, version: snapshot.version },
				newValue: { status: updated.status, version: updated.version },
				type: eventType,
				code: updated.code,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItemTemplate(updated));
	}

	async listItemTemplateAttributes(
		organizationId: string,
		templateId: string,
	): Promise<Result<ItemTemplateAttribute[]>> {
		const rows = [...this.itemTemplateAttributes.values()]
			.filter(
				(row) =>
					row.organizationId === organizationId &&
					row.templateId === templateId,
			)
			.sort((a, b) =>
				a.sortOrder === b.sortOrder
					? a.normalizedCode === b.normalizedCode
						? a.id.localeCompare(b.id)
						: a.normalizedCode.localeCompare(b.normalizedCode)
					: a.sortOrder - b.sortOrder,
			);
		return ok(rows.map(cloneItemTemplateAttribute));
	}

	async listItemTemplateAttributeOptions(
		organizationId: string,
		attributeId: string,
	): Promise<Result<ItemTemplateAttributeOption[]>> {
		const rows = [...this.itemTemplateAttributeOptions.values()]
			.filter(
				(row) =>
					row.organizationId === organizationId &&
					row.attributeId === attributeId,
			)
			.sort((a, b) =>
				a.sortOrder === b.sortOrder
					? a.normalizedCode === b.normalizedCode
						? a.id.localeCompare(b.id)
						: a.normalizedCode.localeCompare(b.normalizedCode)
					: a.sortOrder - b.sortOrder,
			);
		return ok(rows.map(cloneItemTemplateAttributeOption));
	}

	async getItemTemplateAttributeContextById(
		organizationId: string,
		attributeId: string,
	): Promise<Result<ItemTemplateAttributeContext | null>> {
		const attribute = this.itemTemplateAttributes.get(attributeId);
		if (
			attribute === undefined ||
			attribute.organizationId !== organizationId
		) {
			return ok(null);
		}
		const template = this.itemTemplates.get(attribute.templateId);
		if (template === undefined || template.organizationId !== organizationId) {
			return ok(null);
		}
		return ok({
			attribute: cloneItemTemplateAttribute(attribute),
			template: cloneItemTemplate(template),
		});
	}

	async listItemTemplateAttributeOptionsByTemplate(
		organizationId: string,
		templateId: string,
	): Promise<Result<ItemTemplateAttributeOption[]>> {
		const attributeIds = new Set(
			[...this.itemTemplateAttributes.values()]
				.filter(
					(attribute) =>
						attribute.organizationId === organizationId &&
						attribute.templateId === templateId,
				)
				.map((attribute) => attribute.id),
		);
		const rows = [...this.itemTemplateAttributeOptions.values()]
			.filter(
				(option) =>
					option.organizationId === organizationId &&
					attributeIds.has(option.attributeId),
			)
			.sort((a, b) =>
				a.sortOrder === b.sortOrder
					? a.id.localeCompare(b.id)
					: a.sortOrder - b.sortOrder,
			);
		return ok(rows.map(cloneItemTemplateAttributeOption));
	}

	async addItemTemplateAttribute(
		record: ItemTemplateAttributeCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemTemplateAttribute>> {
		const template = this.itemTemplates.get(record.templateId);
		if (
			template === undefined ||
			template.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
				field: "templateId",
			} satisfies MasterFailureDetails);
		}
		if (template.status !== "draft") {
			return fail(
				"CONFLICT",
				"Template attributes can only be added while draft",
				{
					reason: "MASTER_INVALID_STATE",
					field: "templateId",
					actualStatus: template.status,
					requiredStatus: "draft",
				} satisfies MasterFailureDetails,
			);
		}
		if (
			this.hasTemplateAttributeCode(
				record.organizationId,
				record.templateId,
				record.normalizedCode,
			)
		) {
			return fail(
				"CONFLICT",
				"Template attribute code already exists",
				codeConflictDetails(),
			);
		}
		const now = new Date();
		const attribute: ItemTemplateAttribute = {
			id: randomUUID(),
			organizationId: record.organizationId,
			templateId: record.templateId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			name: record.name,
			description: record.description,
			dataType: record.dataType,
			valueKind:
				record.dataType === "single_option" ||
				record.dataType === "multiple_option"
					? "option"
					: "text",
			isRequired: record.isRequired,
			isVariantDefining: record.isVariantDefining,
			isSearchable: record.isSearchable,
			displayOrder: record.displayOrder,
			sortOrder: record.displayOrder,
			validationRules: record.validationRules,
			status: "active",
			archivedAt: null,
			archivedBy: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		this.itemTemplateAttributes.set(attribute.id, attribute);
		const sideEffect = await this.commitMutation(
			() => {
				this.itemTemplateAttributes.delete(attribute.id);
			},
			ports,
			{
				organizationId: attribute.organizationId,
				actorUserId: attribute.createdBy,
				correlationId: meta.correlationId,
				entity: "item_template_attribute",
				entityId: attribute.id,
				action: "CREATE",
				changes: [{ field: "code", oldValue: null, newValue: attribute.code }],
				newValue: { code: attribute.code, dataType: attribute.dataType },
				type: EXTENSION_EVENT_TYPES.itemTemplateAttributeCreated,
				code: attribute.code,
				version: attribute.version,
				eventPayload: createExtensionEventPayload({
					organizationId: attribute.organizationId,
					entityType: "item_template_attribute",
					entityId: attribute.id,
					parentEntityId: attribute.templateId,
					classification: extensionEventClassification(
						"item_template_attribute",
						attribute.code,
					),
					version: attribute.version,
					actorId: attribute.createdBy,
					correlationId: meta.correlationId,
				}),
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItemTemplateAttribute(attribute));
	}

	async addItemTemplateAttributeOption(
		record: ItemTemplateAttributeOptionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemTemplateAttributeOption>> {
		const attribute = this.itemTemplateAttributes.get(record.attributeId);
		if (
			attribute === undefined ||
			attribute.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Item template attribute not found", {
				reason: "MASTER_NOT_FOUND",
				field: "attributeId",
			} satisfies MasterFailureDetails);
		}
		if (
			attribute.dataType !== "single_option" &&
			attribute.dataType !== "multiple_option"
		) {
			return fail(
				"CONFLICT",
				"Options can only be added to option-compatible attributes",
				{
					reason: "MASTER_INVALID_STATE",
					field: "attributeId",
				} satisfies MasterFailureDetails,
			);
		}
		const template = this.itemTemplates.get(attribute.templateId);
		if (
			template === undefined ||
			template.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (template.status !== "draft") {
			return fail(
				"CONFLICT",
				"Template attribute options can only be added while draft",
				{
					reason: "MASTER_INVALID_STATE",
					field: "attributeId",
					actualStatus: template.status,
					requiredStatus: "draft",
				} satisfies MasterFailureDetails,
			);
		}
		if (
			this.hasTemplateAttributeOptionCode(
				record.organizationId,
				record.attributeId,
				record.normalizedCode,
			)
		) {
			return fail(
				"CONFLICT",
				"Template attribute option code already exists",
				codeConflictDetails(),
			);
		}
		const now = new Date();
		const option: ItemTemplateAttributeOption = {
			id: randomUUID(),
			organizationId: record.organizationId,
			attributeId: record.attributeId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			label: record.label,
			description: record.description,
			displayOrder: record.displayOrder,
			sortOrder: record.displayOrder,
			status: "active",
			archivedAt: null,
			archivedBy: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		this.itemTemplateAttributeOptions.set(option.id, option);
		const sideEffect = await this.commitMutation(
			() => {
				this.itemTemplateAttributeOptions.delete(option.id);
			},
			ports,
			{
				organizationId: option.organizationId,
				actorUserId: option.createdBy,
				correlationId: meta.correlationId,
				entity: "item_template_attribute_option",
				entityId: option.id,
				action: "CREATE",
				changes: [{ field: "code", oldValue: null, newValue: option.code }],
				newValue: { code: option.code, label: option.label },
				type: EXTENSION_EVENT_TYPES.itemTemplateAttributeOptionCreated,
				code: option.code,
				version: option.version,
				eventPayload: createExtensionEventPayload({
					organizationId: option.organizationId,
					entityType: "item_template_attribute_option",
					entityId: option.id,
					parentEntityId: option.attributeId,
					classification: extensionEventClassification(
						"item_template_attribute_option",
						option.code,
					),
					version: option.version,
					actorId: option.createdBy,
					correlationId: meta.correlationId,
				}),
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItemTemplateAttributeOption(option));
	}

	archiveItemTemplateAttributeOptionForTest(
		organizationId: string,
		optionId: string,
		actorUserId = "test-actor",
	): Result<ItemTemplateAttributeOption> {
		const existing = this.itemTemplateAttributeOptions.get(optionId);
		if (existing === undefined || existing.organizationId !== organizationId) {
			return fail("NOT_FOUND", "Item template attribute option not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		const archived: ItemTemplateAttributeOption = {
			...existing,
			status: "archived",
			archivedAt: new Date(),
			archivedBy: actorUserId,
			version: existing.version + 1,
			updatedBy: actorUserId,
			updatedAt: new Date(),
		};
		this.itemTemplateAttributeOptions.set(archived.id, archived);
		return ok(cloneItemTemplateAttributeOption(archived));
	}

	async getItemVariantById(
		organizationId: string,
		id: string,
	): Promise<Result<ItemVariant | null>> {
		const variant = this.itemVariants.get(id);
		if (variant === undefined || variant.organizationId !== organizationId) {
			return ok(null);
		}
		const assembled = this.assembleItemVariant(variant);
		if (assembled === null) {
			return fail("INTERNAL_ERROR", "Item variant item row missing");
		}
		return ok(assembled);
	}

	async listItemVariantsByTemplate(
		filter: ListItemVariantsFilter,
	): Promise<Result<ItemVariant[]>> {
		const memberships = [...this.itemVariants.values()].filter(
			(variant) =>
				variant.organizationId === filter.organizationId &&
				variant.templateId === filter.templateId,
		);
		const assembled: ItemVariant[] = [];
		for (const membership of memberships) {
			const item = this.items.get(membership.itemId);
			if (item === undefined || item.organizationId !== filter.organizationId) {
				continue;
			}
			if (filter.status !== undefined && item.status !== filter.status) {
				continue;
			}
			const variant = this.assembleItemVariant(membership);
			if (variant !== null) {
				assembled.push(variant);
			}
		}
		assembled.sort((a, b) =>
			a.item.normalizedCode === b.item.normalizedCode
				? a.id.localeCompare(b.id)
				: a.item.normalizedCode.localeCompare(b.item.normalizedCode),
		);
		return ok(
			paginate(assembled, filter.page, filter.pageSize).map(cloneItemVariant),
		);
	}

	async createItemVariant(
		record: ItemVariantCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemVariant>> {
		if (this.hasLiveItemCode(record.organizationId, record.normalizedCode)) {
			return fail(
				"CONFLICT",
				"Item code or variant combination already exists",
				codeConflictDetails(),
			);
		}
		const baseUom = this.uoms.get(record.baseUomId);
		if (baseUom === undefined || !baseUom.active) {
			return fail("BAD_REQUEST", "baseUomId is not a known platform UoM", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		const group = this.itemGroups.get(record.itemGroupId);
		if (group === undefined || group.organizationId !== record.organizationId) {
			return fail(
				"CONFLICT",
				"itemGroupId must exist in the same organization",
				{ reason: "MASTER_CROSS_ORG_REFERENCE" } satisfies MasterFailureDetails,
			);
		}
		if (group.status === "retired" || group.retiredAt !== null) {
			return fail("CONFLICT", "itemGroupId must not be retired", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
		}
		const template = this.itemTemplates.get(record.templateId);
		if (
			template === undefined ||
			template.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (template.status !== "active" || template.retiredAt !== null) {
			return fail("CONFLICT", "Variants require an active template", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
		}
		const attributes = [...this.itemTemplateAttributes.values()].filter(
			(attribute) =>
				attribute.organizationId === record.organizationId &&
				attribute.templateId === record.templateId &&
				attribute.status === "active" &&
				attribute.archivedAt === null,
		);
		const attributeById = new Map(
			attributes.map((attribute) => [attribute.id, attribute] as const),
		);
		const seen = new Set<string>();
		const entries: Array<{
			attrNormalizedCode: string;
			valueNormalized: string;
		}> = [];
		for (const value of record.attributeValues) {
			if (seen.has(value.attributeId)) {
				return fail("BAD_REQUEST", "Duplicate template attribute value", {
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails);
			}
			seen.add(value.attributeId);
			const attribute = attributeById.get(value.attributeId);
			if (attribute === undefined) {
				return fail("BAD_REQUEST", "Unknown template attribute", {
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails);
			}
			if (value.valueType !== attribute.dataType) {
				return fail("BAD_REQUEST", "Attribute value type mismatch", {
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails);
			}
			const normalized = normalizeVariantAttributeValue({
				dataType: attribute.dataType,
				validationRules: attribute.validationRules,
				value: {
					...(value.textValue === null ? {} : { textValue: value.textValue }),
					...(value.integerValue === null
						? {}
						: { integerValue: value.integerValue }),
					...(value.decimalValue === null
						? {}
						: { decimalValue: value.decimalValue }),
					...(value.booleanValue === null
						? {}
						: { booleanValue: value.booleanValue }),
					...(value.dateValue === null ? {} : { dateValue: value.dateValue }),
					...(value.optionId === null ? {} : { optionId: value.optionId }),
					...(value.optionIds.length === 0
						? {}
						: { optionIds: value.optionIds }),
					...(value.referenceValue === null
						? {}
						: { referenceValue: value.referenceValue }),
				},
			});
			if (!normalized.ok) return normalized;
			let expectedNormalizedValue = normalized.data.normalizedValue;
			const selectedOptionIds =
				attribute.dataType === "single_option"
					? value.optionId === null
						? []
						: [value.optionId]
					: attribute.dataType === "multiple_option"
						? [...value.optionIds]
						: [];
			if (selectedOptionIds.length > 0) {
				const selectedOptions = selectedOptionIds.map((optionId) =>
					this.itemTemplateAttributeOptions.get(optionId),
				);
				if (
					selectedOptions.some(
						(option) =>
							option === undefined ||
							option.organizationId !== record.organizationId ||
							option.attributeId !== attribute.id ||
							option.status !== "active" ||
							option.archivedAt !== null,
					)
				) {
					return fail("BAD_REQUEST", "Invalid option attribute value", {
						reason: "MASTER_VALIDATION_FAILED",
					} satisfies MasterFailureDetails);
				}
				expectedNormalizedValue = selectedOptions
					.map((option) => option?.normalizedCode ?? "")
					.sort()
					.join(",");
			}
			if (value.normalizedValue !== expectedNormalizedValue) {
				return fail("BAD_REQUEST", "Invalid normalized attribute value", {
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails);
			}
			if (attribute.isVariantDefining) {
				entries.push({
					attrNormalizedCode: attribute.normalizedCode,
					valueNormalized: value.normalizedValue,
				});
			}
		}
		if (
			attributes.some(
				(attribute) => attribute.isRequired && !seen.has(attribute.id),
			) ||
			buildCombinationKey(entries) !== record.combinationKey
		) {
			return fail("BAD_REQUEST", "Variant attribute set is incomplete", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		if (
			this.hasLiveCombinationKey(
				record.organizationId,
				record.templateId,
				record.combinationKey,
			)
		) {
			return fail(
				"CONFLICT",
				"Item code or variant combination already exists",
				codeConflictDetails(),
			);
		}

		const now = new Date();
		const item: Item = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			name: record.name,
			itemType: record.itemType,
			baseUomId: record.baseUomId,
			itemGroupId: record.itemGroupId,
			status: "draft",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			activatedAt: null,
			activatedBy: null,
			retiredAt: null,
			retiredBy: null,
			createdAt: now,
			updatedAt: now,
		};
		const variant: ItemVariantMembership = {
			id: randomUUID(),
			organizationId: record.organizationId,
			itemId: item.id,
			templateId: record.templateId,
			combinationKey: record.combinationKey,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			retiredAt: null,
			retiredBy: null,
			createdAt: now,
			updatedAt: now,
		};
		const values: ItemVariantAttributeValue[] = record.attributeValues.map(
			(value) => ({
				id: randomUUID(),
				organizationId: record.organizationId,
				variantId: variant.id,
				attributeId: value.attributeId,
				valueType: value.valueType,
				textValue: value.textValue,
				valueText: value.textValue,
				integerValue: value.integerValue,
				decimalValue: value.decimalValue,
				booleanValue: value.booleanValue,
				dateValue: value.dateValue,
				optionId: value.optionId,
				optionIds: [...value.optionIds],
				referenceValue: value.referenceValue,
				status: "active",
				archivedAt: null,
				archivedBy: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			}),
		);

		this.items.set(item.id, item);
		this.itemVariants.set(variant.id, variant);
		for (const value of values) {
			this.itemVariantAttributeValues.set(value.id, value);
		}

		const rollbackAll = (): void => {
			this.items.delete(item.id);
			this.itemVariants.delete(variant.id);
			for (const value of values) {
				this.itemVariantAttributeValues.delete(value.id);
			}
		};

		const itemSide = await this.commitMutation(rollbackAll, ports, {
			organizationId: item.organizationId,
			actorUserId: item.createdBy,
			correlationId: meta.correlationId,
			entity: "item",
			entityId: item.id,
			action: "CREATE",
			changes: [{ field: "code", oldValue: null, newValue: item.code }],
			newValue: {
				code: item.code,
				baseUomId: item.baseUomId,
				itemGroupId: item.itemGroupId,
				templateId: record.templateId,
			},
			type: "master_data.item.created.v1",
			code: item.code,
			version: item.version,
		});
		if (!itemSide.ok) {
			return itemSide;
		}

		const variantSide = await this.commitMutation(rollbackAll, ports, {
			organizationId: variant.organizationId,
			actorUserId: variant.createdBy,
			correlationId: meta.correlationId,
			entity: "item_variant",
			entityId: variant.id,
			action: "CREATE",
			changes: [
				{
					field: "combinationKey",
					oldValue: null,
					newValue: variant.combinationKey,
				},
			],
			newValue: {
				combinationKey: variant.combinationKey,
				templateId: variant.templateId,
				itemId: variant.itemId,
			},
			type: "master_data.item_variant.created.v1",
			code: variant.combinationKey,
			version: variant.version,
		});
		if (!variantSide.ok) {
			return variantSide;
		}

		for (const value of values) {
			const valueSide = await this.commitMutation(rollbackAll, ports, {
				organizationId: value.organizationId,
				actorUserId: value.createdBy,
				correlationId: meta.correlationId,
				entity: "item_variant_attribute_value",
				entityId: value.id,
				action: "CREATE",
				changes: [
					{
						field: "attributeId",
						oldValue: null,
						newValue: value.attributeId,
					},
				],
				newValue: {
					attributeId: value.attributeId,
					valueType: value.valueType,
					version: value.version,
				},
				type: EXTENSION_EVENT_TYPES.itemVariantAttributeValueAssigned,
				code: value.valueType,
				version: value.version,
				eventPayload: createExtensionEventPayload({
					organizationId: value.organizationId,
					entityType: "item_variant_attribute_value",
					entityId: value.id,
					parentEntityId: value.variantId,
					classification: extensionEventClassification(
						"item_variant_attribute_value",
						value.valueType,
					),
					version: value.version,
					actorId: value.createdBy,
					correlationId: meta.correlationId,
				}),
			});
			if (!valueSide.ok) {
				return valueSide;
			}
		}

		const assembled = this.assembleItemVariant(variant);
		if (assembled === null) {
			return fail("INTERNAL_ERROR", "Item variant create returned no row");
		}
		return ok(assembled);
	}

	async retireItemVariant(
		record: ItemVariantRetireRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemVariant>> {
		const variant = this.itemVariants.get(record.variantId);
		const item = this.items.get(record.itemId);
		if (
			variant === undefined ||
			item === undefined ||
			variant.organizationId !== record.organizationId ||
			item.organizationId !== record.organizationId ||
			variant.itemId !== record.itemId
		) {
			return fail("NOT_FOUND", "Item variant not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		const variantVersion = assertExpectedCoreVersion(
			variant,
			record.expectedVariantVersion,
		);
		if (!variantVersion.ok) return variantVersion;
		const itemVersion = assertExpectedCoreVersion(
			item,
			record.expectedItemVersion,
		);
		if (!itemVersion.ok) return itemVersion;
		const retired = await this.transitionItem(
			{
				organizationId: record.organizationId,
				id: record.itemId,
				expectedVersion: record.expectedItemVersion,
				actorUserId: record.actorUserId,
				toStatus: "retired",
			},
			ports,
			{ correlationId: meta.correlationId, eventSuffix: "retired" },
		);
		if (!retired.ok) {
			return retired;
		}
		const assembled = this.assembleItemVariant(
			this.itemVariants.get(record.variantId) ?? variant,
		);
		return assembled === null
			? fail("INTERNAL_ERROR", "Item variant retire returned no row")
			: ok(assembled);
	}

	async getImportBatchByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<ImportBatchRecord | null>> {
		for (const batch of this.importBatches.values()) {
			if (
				batch.organizationId === organizationId &&
				batch.idempotencyKey === idempotencyKey
			) {
				return ok(batch);
			}
		}
		return ok(null);
	}

	async saveImportBatch(
		record: ImportBatchCreateRecord,
	): Promise<Result<ImportBatchRecord>> {
		const existing = await this.getImportBatchByIdempotencyKey(
			record.organizationId,
			record.idempotencyKey,
		);
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return fail("CONFLICT", "Import batch already exists", {
				reason: "MASTER_IMPORT_IDEMPOTENT_REPLAY",
			} satisfies MasterFailureDetails);
		}
		const now = new Date();
		const batch: ImportBatchRecord = {
			id: randomUUID(),
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
			entityType: record.entityType,
			sourceSystem: record.sourceSystem,
			mode: record.mode,
			status: "applied",
			report: record.report,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			createdAt: now,
			updatedAt: now,
		};
		this.importBatches.set(batch.id, batch);
		return ok(batch);
	}
}

export function createMemoryMasterDataStore(): MemoryMasterDataStore {
	return new MemoryMasterDataStore();
}

/** Fixed UUIDs matching packages/data-plane/db/drizzle/0005_shiny_jean_grey.sql seed. */
export function seedDefaultPlatformRefs(store: MemoryMasterDataStore): void {
	const dimensions: RefUomDimension[] = [
		{
			id: "a1000000-0000-4000-8000-000000000001",
			code: "count",
			name: "Count",
		},
		{ id: "a1000000-0000-4000-8000-000000000002", code: "mass", name: "Mass" },
		{
			id: "a1000000-0000-4000-8000-000000000003",
			code: "volume",
			name: "Volume",
		},
		{
			id: "a1000000-0000-4000-8000-000000000004",
			code: "length",
			name: "Length",
		},
		{ id: "a1000000-0000-4000-8000-000000000005", code: "area", name: "Area" },
		{ id: "a1000000-0000-4000-8000-000000000006", code: "time", name: "Time" },
	];

	const uoms: RefUom[] = [
		{
			id: "b1000000-0000-4000-8000-000000000001",
			code: "EA",
			name: "Each",
			symbol: "ea",
			dimensionId: "a1000000-0000-4000-8000-000000000001",
			toBaseNumerator: "1",
			toBaseDenominator: "1",
			isBase: true,
			active: true,
		},
		{
			id: "b1000000-0000-4000-8000-000000000002",
			code: "KG",
			name: "Kilogram",
			symbol: "kg",
			dimensionId: "a1000000-0000-4000-8000-000000000002",
			toBaseNumerator: "1",
			toBaseDenominator: "1",
			isBase: true,
			active: true,
		},
		{
			id: "b1000000-0000-4000-8000-000000000003",
			code: "G",
			name: "Gram",
			symbol: "g",
			dimensionId: "a1000000-0000-4000-8000-000000000002",
			toBaseNumerator: "1",
			toBaseDenominator: "1000",
			isBase: false,
			active: true,
		},
		{
			id: "b1000000-0000-4000-8000-000000000004",
			code: "L",
			name: "Litre",
			symbol: "L",
			dimensionId: "a1000000-0000-4000-8000-000000000003",
			toBaseNumerator: "1",
			toBaseDenominator: "1",
			isBase: true,
			active: true,
		},
		{
			id: "b1000000-0000-4000-8000-000000000005",
			code: "M",
			name: "Metre",
			symbol: "m",
			dimensionId: "a1000000-0000-4000-8000-000000000004",
			toBaseNumerator: "1",
			toBaseDenominator: "1",
			isBase: true,
			active: true,
		},
		{
			id: "b1000000-0000-4000-8000-000000000006",
			code: "M2",
			name: "Square metre",
			symbol: "m²",
			dimensionId: "a1000000-0000-4000-8000-000000000005",
			toBaseNumerator: "1",
			toBaseDenominator: "1",
			isBase: true,
			active: true,
		},
		{
			id: "b1000000-0000-4000-8000-000000000007",
			code: "S",
			name: "Second",
			symbol: "s",
			dimensionId: "a1000000-0000-4000-8000-000000000006",
			toBaseNumerator: "1",
			toBaseDenominator: "1",
			isBase: true,
			active: true,
		},
		{
			id: "b1000000-0000-4000-8000-000000000008",
			code: "CARTON",
			name: "Carton",
			symbol: "ctn",
			dimensionId: "a1000000-0000-4000-8000-000000000001",
			toBaseNumerator: "1",
			toBaseDenominator: "1",
			isBase: false,
			active: true,
		},
		{
			id: "b1000000-0000-4000-8000-000000000009",
			code: "BOX",
			name: "Box",
			symbol: "box",
			dimensionId: "a1000000-0000-4000-8000-000000000001",
			toBaseNumerator: "1",
			toBaseDenominator: "1",
			isBase: false,
			active: true,
		},
	];

	store.seedRefs({
		dimensions,
		uoms,
		countries: [
			{
				id: "c1000000-0000-4000-8000-000000000001",
				code: "MY",
				alpha3: "MYS",
				name: "Malaysia",
				active: true,
			},
			{
				id: "c1000000-0000-4000-8000-000000000002",
				code: "SG",
				alpha3: "SGP",
				name: "Singapore",
				active: true,
			},
			{
				id: "c1000000-0000-4000-8000-000000000003",
				code: "US",
				alpha3: "USA",
				name: "United States of America",
				active: true,
			},
		],
		currencies: [
			{
				id: "d1000000-0000-4000-8000-000000000001",
				code: "MYR",
				name: "Malaysian Ringgit",
				minorUnits: 2,
				active: true,
			},
			{
				id: "d1000000-0000-4000-8000-000000000002",
				code: "SGD",
				name: "Singapore Dollar",
				minorUnits: 2,
				active: true,
			},
			{
				id: "d1000000-0000-4000-8000-000000000003",
				code: "USD",
				name: "US Dollar",
				minorUnits: 2,
				active: true,
			},
		],
		languages: [
			{
				id: "e1000000-0000-4000-8000-000000000001",
				code: "en",
				name: "English",
				active: true,
			},
			{
				id: "e1000000-0000-4000-8000-000000000002",
				code: "ms",
				name: "Malay",
				active: true,
			},
		],
		timeZones: [
			{
				id: "f1000000-0000-4000-8000-000000000001",
				ianaName: "Asia/Kuala_Lumpur",
				name: "Malaysia Time",
				active: true,
			},
			{
				id: "f1000000-0000-4000-8000-000000000002",
				ianaName: "Asia/Singapore",
				name: "Singapore Time",
				active: true,
			},
			{
				id: "f1000000-0000-4000-8000-000000000003",
				ianaName: "UTC",
				name: "Coordinated Universal Time",
				active: true,
			},
		],
	});
}
