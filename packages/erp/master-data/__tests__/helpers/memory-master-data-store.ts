import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import type { MasterDataEventType } from "@afenda/events";

import type { MasterFailureDetails } from "../../src/contracts/reasons";
import type { MutationPorts } from "../../src/ports";
import type {
	ChangeRequestCreateRecord,
	ChangeRequestListFilter,
	ChangeRequestReviewRecord,
	ItemAliasCreateRecord,
	ItemBarcodeCreateRecord,
	ItemCreateRecord,
	ItemExternalIdCreateRecord,
	ItemGroupCreateRecord,
	ItemGroupUpdateRecord,
	ItemUomCreateRecord,
	ItemUpdateRecord,
	LifecycleRecord,
	ListFilter,
	MasterDataStore,
	ParentListFilter,
	PartyAddressCreateRecord,
	PartyAddressUpdateRecord,
	PartyContactCreateRecord,
	PartyContactUpdateRecord,
	PartyCreateRecord,
	PartyExternalIdCreateRecord,
	PartyMergeRecord,
	PartyRelationshipCreateRecord,
	PartyRoleCreateRecord,
	PartyUpdateRecord,
	PaymentTermCreateRecord,
	PaymentTermUpdateRecord,
	TaxRegistrationCreateRecord,
	TaxRegistrationListFilter,
	TaxRegistrationUpdateRecord,
	WarehouseCreateRecord,
	WarehouseExternalIdCreateRecord,
	WarehouseMoveRecord,
	WarehouseUpdateRecord,
} from "../../src/store";
import type {
	ItemTemplateAttributeCreateRecord,
	ItemTemplateAttributeOptionCreateRecord,
	ItemTemplateCreateRecord,
	ItemTemplateUpdateRecord,
	ItemVariantCreateRecord,
	ListItemVariantsFilter,
} from "../../src/store-variant-records";
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
	return { ...value };
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
					(filter.status === undefined || row.status === filter.status),
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
		record: LifecycleRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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
						other.system === ext.system &&
						other.namespace === ext.namespace &&
						other.externalId === ext.externalId &&
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
			system: "afenda.former_code",
			namespace: "",
			externalId: source.code,
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			createdAt: now,
			updatedAt: now,
		};
		const formerConflict = [...this.partyExternalIds.values()].some(
			(other) =>
				other.organizationId === formerCodeRow.organizationId &&
				other.system === formerCodeRow.system &&
				other.namespace === formerCodeRow.namespace &&
				other.externalId === formerCodeRow.externalId,
		);
		if (!formerConflict) {
			this.partyExternalIds.set(formerCodeId, formerCodeRow);
		}

		const sideEffect = await this.commitMutation(
			() => {
				this.parties.set(sourceSnapshot.id, sourceSnapshot);
				this.parties.set(targetSnapshot.id, targetSnapshot);
				this.changeRequests.set(crSnapshot.id, crSnapshot);
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
					(filter.status === undefined || row.status === filter.status),
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
				],
				oldValue: { name: snapshot.name, version: snapshot.version },
				newValue: { name: updated.name, version: updated.version },
				type: "master_data.item_group.updated.v1",
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
		record: LifecycleRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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

	async listItems(filter: ListFilter): Promise<Result<Item[]>> {
		const rows = [...this.items.values()]
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
		if (!this.uoms.has(record.baseUomId)) {
			return fail("BAD_REQUEST", "baseUomId is not a known platform UoM", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
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
		this.items.set(item.id, item);
		const sideEffect = await this.commitMutation(
			() => {
				this.items.delete(item.id);
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
		if (!this.uoms.has(nextBaseUomId)) {
			return fail("BAD_REQUEST", "baseUomId is not a known platform UoM", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
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
		const snapshot = cloneItem(existing);
		const updated: Item = {
			...existing,
			name: record.name ?? existing.name,
			itemType: record.itemType ?? existing.itemType,
			baseUomId: nextBaseUomId,
			itemGroupId: nextGroupId,
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
				],
				oldValue: { name: snapshot.name, version: snapshot.version },
				newValue: { name: updated.name, version: updated.version },
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
		record: LifecycleRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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
					version: liveVariant.version + 1,
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
					(filter.status === undefined || row.status === filter.status),
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
		);
		if (!parentCheck.ok) {
			return parentCheck;
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
		const updated: Warehouse = {
			...existing,
			name: record.name ?? existing.name,
			locationType: record.locationType ?? existing.locationType,
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
		const parentCheck = this.assertParentWarehouse(
			record.organizationId,
			existing.id,
			record.parentId,
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
		record: LifecycleRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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
					(filter.status === undefined || row.status === filter.status),
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
			netDays: record.netDays,
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
		const snapshot = clonePaymentTerm(existing);
		const updated: PaymentTerm = {
			...existing,
			name: record.name ?? existing.name,
			netDays: record.netDays ?? existing.netDays,
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
		record: LifecycleRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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
						field: "registrationNumber",
						oldValue: null,
						newValue: row.registrationNumber,
					},
				],
				newValue: {
					partyId: row.partyId,
					registrationType: row.registrationType,
					normalizedRegistrationNumber: row.normalizedRegistrationNumber,
					status: row.status,
				},
				type: "master_data.tax_registration.created.v1",
				code: row.normalizedRegistrationNumber,
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
		const snapshot = cloneTaxRegistration(existing);
		const updated: TaxRegistration = {
			...existing,
			name: record.name !== undefined ? record.name : existing.name,
			validFrom:
				record.validFrom !== undefined ? record.validFrom : existing.validFrom,
			validTo: record.validTo !== undefined ? record.validTo : existing.validTo,
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
				code: updated.normalizedRegistrationNumber,
				version: updated.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneTaxRegistration(updated));
	}

	async transitionTaxRegistration(
		record: LifecycleRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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
		const snapshot = cloneTaxRegistration(existing);
		const now = new Date();
		const clearRetired =
			record.toStatus === "draft" && existing.status === "retired";
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
			blockedAt:
				record.toStatus === "blocked"
					? now
					: clearRetired
						? null
						: existing.blockedAt,
			blockedBy:
				record.toStatus === "blocked"
					? record.actorUserId
					: clearRetired
						? null
						: existing.blockedBy,
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
				code: updated.normalizedRegistrationNumber,
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
		let cursor: string | null = parent.parentId;
		const seen = new Set<string>([parentId]);
		while (cursor !== null) {
			if (selfId !== null && cursor === selfId) {
				return fail(
					"BAD_REQUEST",
					"Item group parent would create a cycle",
					validationDetails(),
				);
			}
			if (seen.has(cursor)) {
				return fail(
					"BAD_REQUEST",
					"Item group parent would create a cycle",
					validationDetails(),
				);
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
			payload: {
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
	}): Promise<Result<true>> {
		return this.commitMutation(input.rollback, input.ports, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			entity: input.entity,
			entityId: input.entityId,
			action: input.action,
			changes: [{ field: "id", oldValue: null, newValue: input.entityId }],
			newValue: { code: input.code },
			type: input.type,
			code: input.code,
			version: input.version,
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
				role.retiredAt === null
			) {
				count += 1;
			}
		}
		return ok(count);
	}

	async listPartyRoles(filter: ParentListFilter): Promise<Result<PartyRole[]>> {
		const rows = [...this.partyRoles.values()]
			.filter(
				(r) =>
					r.organizationId === filter.organizationId &&
					r.partyId === filter.parentId,
			)
			.sort((a, b) => a.roleCode.localeCompare(b.roleCode));
		return ok(
			paginate(rows, filter.page, filter.pageSize).map((r) => ({ ...r })),
		);
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
		for (const existing of this.partyRoles.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.partyId === record.partyId &&
				existing.roleCode === record.roleCode &&
				existing.retiredAt === null
			) {
				return fail(
					"CONFLICT",
					"Party role already exists",
					codeConflictDetails(),
				);
			}
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
			type: "master_data.party_role.created.v1",
			rollback: () => this.partyRoles.delete(role.id),
		});
		if (!side.ok) return side;
		this.partyRoles.set(role.id, role);
		return ok({ ...role });
	}

	async transitionPartyRole(
		record: LifecycleRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
	): Promise<Result<PartyRole>> {
		const role = this.partyRoles.get(record.id);
		if (!role || role.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Party role not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		if (role.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Party role version conflict",
				versionConflictDetails(),
			);
		}
		const next: PartyRole = {
			...role,
			status: record.toStatus,
			version: role.version + 1,
			updatedBy: record.actorUserId,
			updatedAt: new Date(),
			activatedAt: record.toStatus === "active" ? new Date() : role.activatedAt,
			activatedBy:
				record.toStatus === "active" ? record.actorUserId : role.activatedBy,
			retiredAt: record.toStatus === "retired" ? new Date() : role.retiredAt,
			retiredBy:
				record.toStatus === "retired" ? record.actorUserId : role.retiredBy,
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
			type: `master_data.party_role.${meta.eventSuffix}.v1` as MasterDataEventType,
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
		const now = new Date();
		const row: PartyAddress = {
			id: randomUUID(),
			organizationId: record.organizationId,
			partyId: record.partyId,
			addressType: record.addressType,
			line1: record.line1,
			line2: record.line2 ?? null,
			city: record.city,
			region: record.region ?? null,
			postalCode: record.postalCode ?? null,
			countryId: record.countryId,
			isDefault: record.isDefault ?? false,
			verificationStatus: "unverified",
			version: 1,
			validFrom: null,
			validTo: null,
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
			entity: "party_address",
			entityId: row.id,
			action: "CREATE",
			code: record.addressType,
			version: 1,
			type: "master_data.party_address.created.v1",
			rollback: () => this.partyAddresses.delete(row.id),
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
		if (row.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Party address version conflict",
				versionConflictDetails(),
			);
		}
		const next: PartyAddress = {
			...row,
			addressType: record.addressType ?? row.addressType,
			line1: record.line1 ?? row.line1,
			line2: record.line2 !== undefined ? record.line2 : row.line2,
			city: record.city ?? row.city,
			region: record.region !== undefined ? record.region : row.region,
			postalCode:
				record.postalCode !== undefined ? record.postalCode : row.postalCode,
			countryId: record.countryId ?? row.countryId,
			isDefault: record.isDefault ?? row.isDefault,
			version: row.version + 1,
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		const prev = { ...row };
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
			type: "master_data.party_address.updated.v1",
			rollback: () => this.partyAddresses.set(row.id, prev),
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
		const now = new Date();
		const row: PartyContact = {
			id: randomUUID(),
			organizationId: record.organizationId,
			partyId: record.partyId,
			contactType: record.contactType,
			value: record.value,
			purpose: record.purpose ?? null,
			isPrimary: record.isPrimary ?? false,
			verificationStatus: "unverified",
			version: 1,
			validFrom: null,
			validTo: null,
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
			entity: "party_contact",
			entityId: row.id,
			action: "CREATE",
			code: record.contactType,
			version: 1,
			type: "master_data.party_contact.created.v1",
			rollback: () => this.partyContacts.delete(row.id),
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
		if (row.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Party contact version conflict",
				versionConflictDetails(),
			);
		}
		const next: PartyContact = {
			...row,
			contactType: record.contactType ?? row.contactType,
			value: record.value ?? row.value,
			purpose: record.purpose !== undefined ? record.purpose : row.purpose,
			isPrimary: record.isPrimary ?? row.isPrimary,
			version: row.version + 1,
			updatedBy: record.updatedBy,
			updatedAt: new Date(),
		};
		const prev = { ...row };
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
			type: "master_data.party_contact.updated.v1",
			rollback: () => this.partyContacts.set(row.id, prev),
		});
		if (!side.ok) return side;
		return ok({ ...next });
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
				existing.system === record.system &&
				existing.namespace === record.namespace &&
				existing.externalId === record.externalId
			) {
				return fail(
					"CONFLICT",
					"External id already exists",
					codeConflictDetails(),
				);
			}
		}
		const now = new Date();
		const row: PartyExternalId = {
			id: randomUUID(),
			organizationId: record.organizationId,
			partyId: record.partyId,
			system: record.system,
			namespace: record.namespace,
			externalId: record.externalId,
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
			entity: "party_external_id",
			entityId: row.id,
			action: "CREATE",
			code: record.externalId,
			version: 1,
			type: "master_data.party_external_id.created.v1",
			rollback: () => this.partyExternalIds.delete(row.id),
		});
		if (!side.ok) return side;
		this.partyExternalIds.set(row.id, row);
		return ok({ ...row });
	}

	async findPartyByExternalId(
		organizationId: string,
		system: string,
		namespace: string,
		externalId: string,
	): Promise<Result<Party | null>> {
		for (const ext of this.partyExternalIds.values()) {
			if (
				ext.organizationId === organizationId &&
				ext.system === system &&
				ext.namespace === namespace &&
				ext.externalId === externalId
			) {
				const party = this.parties.get(ext.partyId);
				return ok(party ? cloneParty(party) : null);
			}
		}
		return ok(null);
	}

	async createPartyRelationship(
		record: PartyRelationshipCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PartyRelationship>> {
		if (record.fromPartyId === record.toPartyId) {
			return fail("BAD_REQUEST", "Party relationship cannot be reflexive", {
				reason: "MASTER_VALIDATION_FAILED",
			});
		}
		const from = this.parties.get(record.fromPartyId);
		const to = this.parties.get(record.toPartyId);
		if (
			!from ||
			!to ||
			from.organizationId !== record.organizationId ||
			to.organizationId !== record.organizationId
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
				existing.fromPartyId === record.fromPartyId &&
				existing.toPartyId === record.toPartyId &&
				existing.relationshipType === record.relationshipType
			) {
				return fail(
					"CONFLICT",
					"Relationship already exists",
					codeConflictDetails(),
				);
			}
		}
		const now = new Date();
		const row: PartyRelationship = {
			id: randomUUID(),
			organizationId: record.organizationId,
			fromPartyId: record.fromPartyId,
			toPartyId: record.toPartyId,
			relationshipType: record.relationshipType,
			status: "active",
			version: 1,
			validFrom: null,
			validTo: null,
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
			type: "master_data.party_relationship.created.v1",
			rollback: () => this.partyRelationships.delete(row.id),
		});
		if (!side.ok) return side;
		this.partyRelationships.set(row.id, row);
		return ok({ ...row });
	}

	async listItemUoms(filter: ParentListFilter): Promise<Result<ItemUom[]>> {
		const rows = [...this.itemUoms.values()]
			.filter(
				(r) =>
					r.organizationId === filter.organizationId &&
					r.itemId === filter.parentId,
			)
			.sort((a, b) => a.usage.localeCompare(b.usage));
		return ok(
			paginate(rows, filter.page, filter.pageSize).map((r) => ({ ...r })),
		);
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
		const altUom = this.uoms.get(record.uomId);
		if (!baseUom || !altUom) {
			return fail("BAD_REQUEST", "UoM not found", {
				reason: "MASTER_VALIDATION_FAILED",
			});
		}
		if (baseUom.dimensionId !== altUom.dimensionId) {
			return fail("BAD_REQUEST", "UoM dimension mismatch", {
				reason: "MASTER_INVALID_UOM_CONVERSION",
			});
		}
		const now = new Date();
		const row: ItemUom = {
			id: randomUUID(),
			organizationId: record.organizationId,
			itemId: record.itemId,
			uomId: record.uomId,
			toBaseNumerator: record.toBaseNumerator,
			toBaseDenominator: record.toBaseDenominator,
			usage: record.usage,
			barcode: record.barcode ?? null,
			roundingRule: record.roundingRule ?? null,
			minQuantity: record.minQuantity ?? null,
			version: 1,
			validFrom: null,
			validTo: null,
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
			code: record.usage,
			version: 1,
			type: "master_data.item_uom.created.v1",
			rollback: () => this.itemUoms.delete(row.id),
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
		if (!item || item.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		for (const existing of this.itemBarcodes.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.barcode === record.barcode
			) {
				return fail(
					"CONFLICT",
					"Barcode already exists",
					codeConflictDetails(),
				);
			}
		}
		const now = new Date();
		const row: ItemBarcode = {
			id: randomUUID(),
			organizationId: record.organizationId,
			itemId: record.itemId,
			barcode: record.barcode,
			barcodeType: record.barcodeType,
			isPrimary: record.isPrimary ?? false,
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
			code: record.barcode,
			version: 1,
			type: "master_data.item_barcode.created.v1",
			rollback: () => this.itemBarcodes.delete(row.id),
		});
		if (!side.ok) return side;
		this.itemBarcodes.set(row.id, row);
		return ok({ ...row });
	}

	async createItemExternalId(
		record: ItemExternalIdCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemExternalId>> {
		const item = this.items.get(record.itemId);
		if (!item || item.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		for (const existing of this.itemExternalIds.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.system === record.system &&
				existing.namespace === record.namespace &&
				existing.externalId === record.externalId
			) {
				return fail(
					"CONFLICT",
					"External id already exists",
					codeConflictDetails(),
				);
			}
		}
		const now = new Date();
		const row: ItemExternalId = {
			id: randomUUID(),
			organizationId: record.organizationId,
			itemId: record.itemId,
			system: record.system,
			namespace: record.namespace,
			externalId: record.externalId,
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
			code: record.externalId,
			version: 1,
			type: "master_data.item_external_id.created.v1",
			rollback: () => this.itemExternalIds.delete(row.id),
		});
		if (!side.ok) return side;
		this.itemExternalIds.set(row.id, row);
		return ok({ ...row });
	}

	async findItemByExternalId(
		organizationId: string,
		system: string,
		namespace: string,
		externalId: string,
	): Promise<Result<Item | null>> {
		for (const ext of this.itemExternalIds.values()) {
			if (
				ext.organizationId === organizationId &&
				ext.system === system &&
				ext.namespace === namespace &&
				ext.externalId === externalId
			) {
				const item = this.items.get(ext.itemId);
				return ok(item ? cloneItem(item) : null);
			}
		}
		return ok(null);
	}

	async createItemAlias(
		record: ItemAliasCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemAlias>> {
		const item = this.items.get(record.itemId);
		if (!item || item.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			});
		}
		for (const existing of this.itemAliases.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.normalizedAlias === record.normalizedAlias &&
				existing.retiredAt === null
			) {
				return fail("CONFLICT", "Alias already exists", codeConflictDetails());
			}
		}
		const now = new Date();
		const row: ItemAlias = {
			id: randomUUID(),
			organizationId: record.organizationId,
			itemId: record.itemId,
			aliasCode: record.aliasCode,
			normalizedAlias: record.normalizedAlias,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			retiredAt: null,
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
			code: record.aliasCode,
			version: 1,
			type: "master_data.item_alias.created.v1",
			rollback: () => this.itemAliases.delete(row.id),
		});
		if (!side.ok) return side;
		this.itemAliases.set(row.id, row);
		return ok({ ...row });
	}

	async findItemByAlias(
		organizationId: string,
		normalizedAlias: string,
	): Promise<Result<Item | null>> {
		for (const alias of this.itemAliases.values()) {
			if (
				alias.organizationId === organizationId &&
				alias.normalizedAlias === normalizedAlias &&
				alias.retiredAt === null
			) {
				const item = this.items.get(alias.itemId);
				return ok(item ? cloneItem(item) : null);
			}
		}
		return ok(null);
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
		for (const existing of this.warehouseExternalIds.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.system === record.system &&
				existing.namespace === record.namespace &&
				existing.externalId === record.externalId
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
			system: record.system,
			namespace: record.namespace,
			externalId: record.externalId,
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
			code: record.externalId,
			version: 1,
			type: "master_data.warehouse_external_id.created.v1",
			rollback: () => this.warehouseExternalIds.delete(row.id),
		});
		if (!side.ok) return side;
		this.warehouseExternalIds.set(row.id, row);
		return ok({ ...row });
	}

	async findWarehouseByExternalId(
		organizationId: string,
		system: string,
		namespace: string,
		externalId: string,
	): Promise<Result<Warehouse | null>> {
		for (const ext of this.warehouseExternalIds.values()) {
			if (
				ext.organizationId === organizationId &&
				ext.system === system &&
				ext.namespace === namespace &&
				ext.externalId === externalId
			) {
				const warehouse = this.warehouses.get(ext.warehouseId);
				return ok(warehouse ? cloneWarehouse(warehouse) : null);
			}
		}
		return ok(null);
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
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Item template version conflict",
				versionConflictDetails(),
			);
		}
		const snapshot = cloneItemTemplate(existing);
		const updated: ItemTemplate = {
			...existing,
			name: record.name ?? existing.name,
			version: existing.version + 1,
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
		record: LifecycleRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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
		if (existing.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Item template version conflict",
				versionConflictDetails(),
			);
		}
		const snapshot = cloneItemTemplate(existing);
		const now = new Date();
		const updated: ItemTemplate = {
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
					? a.id.localeCompare(b.id)
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
			} satisfies MasterFailureDetails);
		}
		if (template.status !== "draft") {
			return fail(
				"CONFLICT",
				"Template attributes can only be added while draft",
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
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
			valueKind: record.valueKind,
			isRequired: record.isRequired,
			sortOrder: record.sortOrder,
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
				newValue: { code: attribute.code, valueKind: attribute.valueKind },
				type: "master_data.item_template_attribute.created.v1",
				code: attribute.code,
				version: attribute.version,
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
			} satisfies MasterFailureDetails);
		}
		if (attribute.valueKind !== "option") {
			return fail(
				"BAD_REQUEST",
				"Options can only be added to option-kind attributes",
				{ reason: "MASTER_VALIDATION_FAILED" } satisfies MasterFailureDetails,
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
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
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
			sortOrder: record.sortOrder,
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
				type: "master_data.item_template_attribute_option.created.v1",
				code: option.code,
				version: option.version,
			},
		);
		if (!sideEffect.ok) {
			return sideEffect;
		}
		return ok(cloneItemTemplateAttributeOption(option));
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
		if (!this.uoms.has(record.baseUomId)) {
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
		const template = this.itemTemplates.get(record.templateId);
		if (
			template === undefined ||
			template.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
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
				valueText: value.valueText,
				optionId: value.optionId,
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

		const assembled = this.assembleItemVariant(variant);
		if (assembled === null) {
			return fail("INTERNAL_ERROR", "Item variant create returned no row");
		}
		return ok(assembled);
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
