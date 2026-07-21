import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesPermission,
} from "../../src/authorization";

/** Test double — grants an explicit permission set. */
export function createGrantingHumanResourcesAuthorization(
	grants: readonly HumanResourcesPermission[],
): HumanResourcesAuthorizationPort {
	const allowed = new Set(grants);
	return {
		async can(input) {
			return allowed.has(input.permission);
		},
	};
}
