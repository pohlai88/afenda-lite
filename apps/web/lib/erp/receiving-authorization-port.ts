import type { ReceivingAuthorizationPort } from "@afenda/receiving";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createReceivingAuthorizationPort(): ReceivingAuthorizationPort {
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
