import type {
	ReceivingAuthorizationPort,
	ReceivingPermission,
} from "../../src/authorization";

export function createGrantingReceivingAuthorization(
	permissions: readonly ReceivingPermission[],
): ReceivingAuthorizationPort {
	const grants = new Set(permissions);
	return {
		async can(input) {
			return grants.has(input.permission);
		},
	};
}
