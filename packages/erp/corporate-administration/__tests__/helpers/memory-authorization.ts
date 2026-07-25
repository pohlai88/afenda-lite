import type { CorporateAdministrationAuthorizationPort } from "../../src/authorization";
import type { CaPermission } from "../../src/permissions";

export function createGrantingCaAuthorization(
	permissions: readonly CaPermission[],
): CorporateAdministrationAuthorizationPort {
	const allowed = new Set<string>(permissions);
	return {
		async can(input) {
			return allowed.has(input.permission);
		},
	};
}
