import { errorResult, type Result } from "@afenda/errors";
import type { Item, RefUom, Warehouse } from "@afenda/master-data";

import type { MasterLookupPort } from "../../src/ports";

export interface MemoryMastersSeed {
	items?: Item[];
	uoms?: RefUom[];
	warehouses?: Warehouse[];
}

export function createMemoryMasterLookup(
	seed: MemoryMastersSeed = {},
): MasterLookupPort {
	const items = new Map((seed.items ?? []).map((row) => [row.id, row]));
	const uoms = new Map((seed.uoms ?? []).map((row) => [row.id, row]));
	const warehouses = new Map(
		(seed.warehouses ?? []).map((row) => [row.id, row]),
	);

	return {
		getItemById(
			organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<Item | null>> {
			const row = items.get(id);
			if (row === undefined || row.organizationId !== organizationId) {
				return Promise.resolve(errorResult.ok(null));
			}
			return Promise.resolve(errorResult.ok(row));
		},
		getRefUomById(
			_organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<RefUom | null>> {
			return Promise.resolve(errorResult.ok(uoms.get(id) ?? null));
		},
		getWarehouseById(
			organizationId: string,
			id: string,
			_actorUserId: string,
		): Promise<Result<Warehouse | null>> {
			const row = warehouses.get(id);
			if (row === undefined || row.organizationId !== organizationId) {
				return Promise.resolve(errorResult.ok(null));
			}
			return Promise.resolve(errorResult.ok(row));
		},
	};
}

function baseMaster(
	organizationId: string,
	id: string,
	code: string,
	name: string,
	status: Item["status"],
) {
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
