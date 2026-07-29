import type {
	FulfillmentAuthorizationPort,
	FulfillmentPermission,
} from "../../src/authorization";

export function createGrantingFulfillmentAuthorization(
	permissions: FulfillmentPermission[],
): FulfillmentAuthorizationPort {
	const granted = new Set(permissions);
	return {
		can(input) {
			return Promise.resolve(granted.has(input.permission));
		},
	};
}
