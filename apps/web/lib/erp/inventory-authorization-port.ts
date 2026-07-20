import type { InventoryAuthorizationPort } from "@afenda/inventory";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createInventoryAuthorizationPort(): InventoryAuthorizationPort {
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
