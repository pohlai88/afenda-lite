import { ok, type Result } from "@afenda/errors/result";
import type {
	Item,
	Party,
	PaymentTerm,
	RefUom,
	Warehouse,
} from "@afenda/master-data";

import type { MasterLookupPort } from "../../src/ports";
import { resolveAsync } from "../../src/resolve-async";

export interface MemoryMastersSeed {
	items?: Item[];
	parties?: Party[];
	paymentTerms?: PaymentTerm[];
	/** Party IDs that have an active supplier role in the test harness. */
	supplierPartyIds?: string[];
	uoms?: RefUom[];
	warehouses?: Warehouse[];
}

export function createMemoryMasterLookup(
	seed: MemoryMastersSeed = {},
): MasterLookupPort {
	const parties = new Map((seed.parties ?? []).map((row) => [row.id, row]));
	const items = new Map((seed.items ?? []).map((row) => [row.id, row]));
	const terms = new Map((seed.paymentTerms ?? []).map((row) => [row.id, row]));
	const uoms = new Map((seed.uoms ?? []).map((row) => [row.id, row]));
	const warehouses = new Map(
		(seed.warehouses ?? []).map((row) => [row.id, row]),
	);
	const supplierPartyIds = new Set(seed.supplierPartyIds ?? []);

	return {
		getPartyById(
			organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<Party | null>> {
			return resolveAsync(() => {
				const row = parties.get(id);
				if (row === undefined || row.organizationId !== organizationId) {
					return ok(null);
				}
				return ok(row);
			});
		},
		getItemById(
			organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<Item | null>> {
			return resolveAsync(() => {
				const row = items.get(id);
				if (row === undefined || row.organizationId !== organizationId) {
					return ok(null);
				}
				return ok(row);
			});
		},
		getPaymentTermById(
			organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<PaymentTerm | null>> {
			return resolveAsync(() => {
				const row = terms.get(id);
				if (row === undefined || row.organizationId !== organizationId) {
					return ok(null);
				}
				return ok(row);
			});
		},
		getRefUomById(
			_organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<RefUom | null>> {
			return resolveAsync(() => ok(uoms.get(id) ?? null));
		},
		hasActiveSupplierRole(
			organizationId: string,
			partyId: string,
			_actorUserId: string,
		): Promise<Result<boolean>> {
			return resolveAsync(() => {
				const party = parties.get(partyId);
				if (party === undefined || party.organizationId !== organizationId) {
					return ok(false);
				}
				return ok(supplierPartyIds.has(partyId));
			});
		},
		getWarehouseById(
			organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<Warehouse | null>> {
			return resolveAsync(() => {
				const row = warehouses.get(id);
				if (row === undefined || row.organizationId !== organizationId) {
					return ok(null);
				}
				return ok(row);
			});
		},
	};
}

function baseMaster(
	organizationId: string,
	id: string,
	code: string,
	name: string,
	status: Party["status"],
): Omit<
	Party,
	| "partyKind"
	| "legalName"
	| "tradingName"
	| "registrationNumber"
	| "registrationCountryId"
	| "preferredLanguageId"
	| "defaultCurrencyId"
	| "mergedIntoId"
	| "blockedAt"
	| "blockedBy"
> {
	const now = new Date();
	return {
		id,
		organizationId,
		code,
		normalizedCode: code.toUpperCase(),
		name,
		status,
		version: 1,
		createdBy: "user-1",
		updatedBy: "user-1",
		activatedAt: status === "active" ? now : null,
		activatedBy: status === "active" ? "user-1" : null,
		retiredAt: null,
		retiredBy: null,
		createdAt: now,
		updatedAt: now,
	};
}

export function seedParty(
	organizationId: string,
	id: string,
	code: string,
	status: Party["status"] = "active",
): Party {
	return {
		...baseMaster(organizationId, id, code, `Party ${code}`, status),
		partyKind: "organization",
		legalName: null,
		tradingName: null,
		registrationNumber: null,
		registrationCountryId: null,
		preferredLanguageId: null,
		defaultCurrencyId: null,
		mergedIntoId: null,
		blockedAt: null,
		blockedBy: null,
	};
}

export function seedItem(
	organizationId: string,
	id: string,
	code: string,
	baseUomId: string,
	status: Item["status"] = "active",
): Item {
	return {
		...baseMaster(organizationId, id, code, `Item ${code}`, status),
		itemType: "stock",
		description: null,
		baseUomId,
		itemGroupId: "00000000-0000-4000-8000-000000000099",
		trackingPolicy: "none",
		sellable: true,
		purchasable: true,
		stocked: true,
		serviceIndicator: false,
	};
}

export function seedPaymentTerm(
	organizationId: string,
	id: string,
	code: string,
	netDays: number,
	status: PaymentTerm["status"] = "active",
): PaymentTerm {
	return {
		...baseMaster(organizationId, id, code, `Term ${code}`, status),
		netDays,
		discountDays: null,
		discountPercent: null,
		dueDayRule: "net_days",
		endOfMonth: false,
		installmentPolicy: "none",
		installmentCount: null,
		validFrom: null,
		validTo: null,
		currencyRestrictionId: null,
	};
}

export function seedWarehouse(
	organizationId: string,
	id: string,
	code: string,
	status: Warehouse["status"] = "active",
): Warehouse {
	return {
		...baseMaster(organizationId, id, code, `Warehouse ${code}`, status),
		locationType: "warehouse",
		parentId: null,
		addressCountryId: null,
		addressLine1: null,
		addressLine2: null,
		addressCity: null,
		addressRegion: null,
		addressPostalCode: null,
	};
}

export function seedUom(id: string, code: string): RefUom {
	return {
		id,
		code,
		name: code,
		symbol: code,
		dimensionId: "00000000-0000-4000-8000-000000000001",
		toBaseNumerator: "1",
		toBaseDenominator: "1",
		isBase: true,
		active: true,
	};
}
