import type {
	PurchasingAuthorizationPort,
	PurchasingPermission,
} from "../../src/authorization";
import { resolveAsync } from "../../src/resolve-async";

/** Test double — grants an explicit permission set (not a product stub). */
export function createGrantingPurchasingAuthorization(
	grants: readonly PurchasingPermission[],
): PurchasingAuthorizationPort {
	const allowed = new Set(grants);
	return {
		can(input) {
			return resolveAsync(() => allowed.has(input.permission));
		},
	};
}
