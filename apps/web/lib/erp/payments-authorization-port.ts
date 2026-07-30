import type { PaymentsAuthorizationPort } from "@afenda/payments";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createPaymentsAuthorizationPort(): PaymentsAuthorizationPort {
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
