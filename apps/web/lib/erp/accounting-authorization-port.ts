import type { AccountingAuthorizationPort } from "@afenda/accounting";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createAccountingAuthorizationPort(): AccountingAuthorizationPort {
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
