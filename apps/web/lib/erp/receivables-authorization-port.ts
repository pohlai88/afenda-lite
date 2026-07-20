import type { ReceivablesAuthorizationPort } from "@afenda/receivables";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createReceivablesAuthorizationPort(): ReceivablesAuthorizationPort {
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
