import type {
	InventoryAuthorizationPort,
	InventoryPermission,
} from "../../src/authorization";
import { INVENTORY_PERMISSION_CODES } from "../../src/permissions";

/** Test double — grants an explicit permission set (not a product stub). */
export function createGrantingInventoryAuthorization(
	grants: readonly InventoryPermission[],
): InventoryAuthorizationPort {
	const allowed = new Set(grants);
	return {
		async can(input) {
			return allowed.has(input.permission);
		},
	};
}

export function createAllowAllInventoryAuthorization(): InventoryAuthorizationPort {
	return createGrantingInventoryAuthorization(INVENTORY_PERMISSION_CODES);
}
