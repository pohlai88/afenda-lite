import type {
	ReceivingAuthorizationPort,
	ReceivingPermission,
} from "../../src/authorization";
import { resolveAsync } from "../../src/resolve-async";

export function createGrantingReceivingAuthorization(
	permissions: readonly ReceivingPermission[],
): ReceivingAuthorizationPort {
	const grants = new Set(permissions);
	return {
		can(input) {
			return resolveAsync(() => grants.has(input.permission));
		},
	};
}
