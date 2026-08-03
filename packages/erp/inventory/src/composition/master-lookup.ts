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

import type { MasterLookupPort } from "../kernel/contracts/ports";

/** Production lookup — sole master resolution path via `@afenda/master-data`. */
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
			if (!result.ok) {
				return result;
			}
			return errorResult.ok(result.data);
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
			if (!result.ok) {
				return result;
			}
			return errorResult.ok(result.data);
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
			if (!result.ok) {
				return result;
			}
			return errorResult.ok(result.data);
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
	if (result.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
		});
	}
	return errorResult.ok(result.data);
}
