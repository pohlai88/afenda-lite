import { ok, type Result } from "@afenda/errors/result";
import type { Item, RefUom, Warehouse } from "@afenda/master-data";

import type { MasterLookupPort } from "../../src/ports";

export function createMemoryMasterLookup(
	seed: { items?: Item[]; uoms?: RefUom[]; warehouses?: Warehouse[] } = {},
): MasterLookupPort {
	const items = new Map((seed.items ?? []).map((row) => [row.id, row]));
	const uoms = new Map((seed.uoms ?? []).map((row) => [row.id, row]));
	const warehouses = new Map(
		(seed.warehouses ?? []).map((row) => [row.id, row]),
	);
	return {
		async getItemById(organizationId, id): Promise<Result<Item | null>> {
			const row = items.get(id);
			return ok(
				row === undefined || row.organizationId !== organizationId ? null : row,
			);
		},
		async getRefUomById(id): Promise<Result<RefUom | null>> {
			return ok(uoms.get(id) ?? null);
		},
		async getWarehouseById(
			organizationId,
			id,
		): Promise<Result<Warehouse | null>> {
			const row = warehouses.get(id);
			return ok(
				row === undefined || row.organizationId !== organizationId ? null : row,
			);
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
		baseUomId,
		itemGroupId: "00000000-0000-4000-8000-000000000099",
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
