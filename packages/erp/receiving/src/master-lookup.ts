import { errorResult, type Result } from "@afenda/errors";
import {
	getItemById,
	getRefUomById,
	getWarehouseById,
	type Item,
	type MasterAuthorizationPort,
	type RefUom,
	type Warehouse,
} from "@afenda/master-data";

import type { MasterLookupPort } from "./ports";

export function createMasterDataLookupPort(
	authorization?: MasterAuthorizationPort,
): MasterLookupPort {
	return {
		async getItemById(
			organizationId: string,
			id: string,
			actorUserId: string,
		): Promise<Result<Item | null>> {
			const result = await getItemById(
				{ organizationId, id, actorUserId },
				{ authorization },
			);
			return result.ok ? errorResult.ok(result.data) : result;
		},
		async getRefUomById(
			organizationId: string,
			id: string,
			actorUserId: string,
		): Promise<Result<RefUom | null>> {
			const result = await getRefUomById(
				{ organizationId, id, actorUserId },
				{ authorization },
			);
			return result.ok ? errorResult.ok(result.data) : result;
		},
		async getWarehouseById(
			organizationId: string,
			id: string,
			actorUserId: string,
		): Promise<Result<Warehouse | null>> {
			const result = await getWarehouseById(
				{ organizationId, id, actorUserId },
				{ authorization },
			);
			return result.ok ? errorResult.ok(result.data) : result;
		},
	};
}

export function requireMaster<T>(
	result: Result<T | null>,
	_notFoundMessage: string,
): Result<T> {
	if (!result.ok) {
		return result;
	}
	return result.data === null
		? errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
			})
		: errorResult.ok(result.data);
}
