import { ok, type Result } from "@afenda/errors/result";
import type { Item, Party, PaymentTerm, RefUom } from "@afenda/master-data";

import type { MasterLookupPort } from "../../src/ports";

export type MemoryMastersSeed = {
	parties?: Party[];
	items?: Item[];
	paymentTerms?: PaymentTerm[];
	uoms?: RefUom[];
	/** partyId → has active customer role */
	customerRoles?: Record<string, boolean>;
};

export function createMemoryMasterLookup(
	seed: MemoryMastersSeed = {},
): MasterLookupPort {
	const parties = new Map((seed.parties ?? []).map((row) => [row.id, row]));
	const items = new Map((seed.items ?? []).map((row) => [row.id, row]));
	const terms = new Map((seed.paymentTerms ?? []).map((row) => [row.id, row]));
	const uoms = new Map((seed.uoms ?? []).map((row) => [row.id, row]));
	const customerRoles = seed.customerRoles ?? {};

	return {
		async getPartyById(
			organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<Party | null>> {
			const row = parties.get(id);
			if (row === undefined || row.organizationId !== organizationId) {
				return ok(null);
			}
			return ok(row);
		},
		async getItemById(
			organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<Item | null>> {
			const row = items.get(id);
			if (row === undefined || row.organizationId !== organizationId) {
				return ok(null);
			}
			return ok(row);
		},
		async getPaymentTermById(
			organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<PaymentTerm | null>> {
			const row = terms.get(id);
			if (row === undefined || row.organizationId !== organizationId) {
				return ok(null);
			}
			return ok(row);
		},
		async getRefUomById(
			_organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<RefUom | null>> {
			return ok(uoms.get(id) ?? null);
		},
		async hasActiveCustomerRole(
			_organizationId: string,
			partyId: string,
			_actorUserId: string,
		): Promise<Result<boolean>> {
			return ok(customerRoles[partyId] ?? false);
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
		baseUomId,
		itemGroupId: "00000000-0000-4000-8000-000000000099",
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
