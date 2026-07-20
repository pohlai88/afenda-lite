import { fail, ok, type Result } from "@afenda/errors/result";
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
			return ok(result.data);
		},
		async getRefUomById(id: string): Promise<Result<RefUom | null>> {
			const result = await getRefUomById({ id });
			if (!result.ok) {
				return result;
			}
			return ok(result.data);
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
			return ok(result.data);
		},
	};
}

export function requireMaster<T>(
	result: Result<T | null>,
	notFoundMessage: string,
): Result<T> {
	if (!result.ok) {
		return result;
	}
	if (result.data === null) {
		return fail("NOT_FOUND", notFoundMessage);
	}
	return ok(result.data);
}
