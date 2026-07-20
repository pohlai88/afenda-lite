import type {
	MasterAuthorizationPort,
	MasterPermission,
} from "../../src/authorization";

/** Test double — grants an explicit permission set (not a product stub). */
export function createGrantingMasterAuthorization(
	grants: readonly MasterPermission[],
): MasterAuthorizationPort {
	const allowed = new Set(grants);
	return {
		async can(input) {
			return allowed.has(input.permission);
		},
	};
}
