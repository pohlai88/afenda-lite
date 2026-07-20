import type {
	InventoryAuthorizationPort,
	InventoryPermission,
} from "../../src/authorization";

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
