import type { PayablesAuthorizationPort } from "@afenda/payables";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createPayablesAuthorizationPort(): PayablesAuthorizationPort {
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
