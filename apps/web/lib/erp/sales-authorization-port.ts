import type { SalesAuthorizationPort } from "@afenda/sales";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createSalesAuthorizationPort(): SalesAuthorizationPort {
	return {
		async can(input) {
			return await hasPermission({
				orgId: input.organizationId,
				userId: input.actorUserId,
				code: input.permission,
			});
		},
	};
}
