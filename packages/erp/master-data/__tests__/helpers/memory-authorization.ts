import type {
	MasterAuthorizationPort,
	MasterPermission,
} from "../../src/authorization";

import { resolveAsync } from "../../src/resolve-async";

/** Test double — grants an explicit permission set (not a product stub). */
export function createGrantingMasterAuthorization(
	grants: readonly MasterPermission[],
): MasterAuthorizationPort {
	const allowed = new Set(grants);
	return {
		can(input) {
			return resolveAsync(() => allowed.has(input.permission));
		},
	};
}
