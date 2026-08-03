import { resolveAsync } from "../../src/kernel/execution/async";
import type {
	ReceivingAuthorizationPort,
	ReceivingPermission,
} from "../../src/kernel/execution/authorization";

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
