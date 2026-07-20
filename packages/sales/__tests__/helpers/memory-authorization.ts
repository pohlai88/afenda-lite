import type {
	SalesAuthorizationPort,
	SalesPermission,
} from "../../src/authorization";

/** Test double — grants an explicit permission set (not a product stub). */
export function createGrantingSalesAuthorization(
	grants: readonly SalesPermission[],
): SalesAuthorizationPort {
	const allowed = new Set(grants);
	return {
		async can(input) {
			return allowed.has(input.permission);
		},
	};
}
