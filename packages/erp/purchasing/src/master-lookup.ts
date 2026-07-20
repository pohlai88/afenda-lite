import { fail, ok, type Result } from "@afenda/errors/result";
import {
	getItemById,
	getPartyById,
	getPaymentTermById,
	getRefUomById,
	getWarehouseById,
	type Item,
	listPartyRoles,
	type MasterAuthorizationPort,
	type Party,
	type PaymentTerm,
	type RefUom,
	type Warehouse,
} from "@afenda/master-data";

import type { MasterLookupPort } from "./ports";

/** Production lookup — sole master resolution path via `@afenda/master-data`. */
export function createMasterDataLookupPort(
	authorization?: MasterAuthorizationPort,
): MasterLookupPort {
	return {
		async getPartyById(
			organizationId: string,
			id: string,
			actorUserId: string,
		): Promise<Result<Party | null>> {
			const result = await getPartyById(
				{ organizationId, id, actorUserId },
				{ authorization },
			);
			if (!result.ok) {
				return result;
			}
			return ok(result.data);
		},
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
		async getPaymentTermById(
			organizationId: string,
			id: string,
			actorUserId: string,
		): Promise<Result<PaymentTerm | null>> {
			const result = await getPaymentTermById(
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
		async hasActiveSupplierRole(
			organizationId: string,
			partyId: string,
			actorUserId: string,
		): Promise<Result<boolean>> {
			const roles = await listPartyRoles(
				{
					organizationId,
					actorUserId,
					parentId: partyId,
					page: 1,
					pageSize: 100,
				},
				{ authorization },
			);
			if (!roles.ok) {
				return roles;
			}
			const active = roles.data.some(
				(role) => role.roleCode === "supplier" && role.status === "active",
			);
			return ok(active);
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
