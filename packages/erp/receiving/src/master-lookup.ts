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
			return result.ok ? ok(result.data) : result;
		},
		async getRefUomById(id: string): Promise<Result<RefUom | null>> {
			const result = await getRefUomById({ id });
			return result.ok ? ok(result.data) : result;
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
			return result.ok ? ok(result.data) : result;
		},
	};
}

export function requireMaster<T>(
	result: Result<T | null>,
	notFoundMessage: string,
): Result<T> {
	if (!result.ok) return result;
	return result.data === null
		? fail("NOT_FOUND", notFoundMessage)
		: ok(result.data);
}
