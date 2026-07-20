import type {
	FulfillmentAuthorizationPort,
	FulfillmentPermission,
} from "../../src/authorization";

export function createGrantingFulfillmentAuthorization(
	permissions: FulfillmentPermission[],
): FulfillmentAuthorizationPort {
	const granted = new Set(permissions);
	return {
		async can(input) {
			return granted.has(input.permission);
		},
	};
}
