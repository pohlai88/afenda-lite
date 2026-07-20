import type { PurchasingAuthorizationPort } from "@afenda/purchasing";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createPurchasingAuthorizationPort(): PurchasingAuthorizationPort {
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
