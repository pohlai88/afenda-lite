import type {
	PurchasingAuthorizationPort,
	PurchasingPermission,
} from "../../src/authorization";

/** Test double — grants an explicit permission set (not a product stub). */
export function createGrantingPurchasingAuthorization(
	grants: readonly PurchasingPermission[],
): PurchasingAuthorizationPort {
	const allowed = new Set(grants);
	return {
		async can(input) {
			return allowed.has(input.permission);
		},
	};
}
