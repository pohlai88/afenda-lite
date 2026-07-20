import type { FulfillmentAuthorizationPort } from "@afenda/fulfillment";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createFulfillmentAuthorizationPort(): FulfillmentAuthorizationPort {
	return {
		async can(input) {
			return hasPermission({
				orgId: input.organizationId,
				userId: input.actorUserId,
				code: input.permission,
			});
		},
	};
}
