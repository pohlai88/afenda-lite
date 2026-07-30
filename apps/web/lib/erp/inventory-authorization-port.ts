import type {
	InventoryAuthorizationPort,
	InventoryPermission,
} from "@afenda/inventory";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createInventoryAuthorizationPort(): InventoryAuthorizationPort {
	return {
		async can(input) {
			const permission: InventoryPermission = input.permission;
			return await hasPermission({
				orgId: input.organizationId,
				userId: input.actorUserId,
				code: permission,
			});
		},
	};
}
