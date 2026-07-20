import type {
	ReceivablesAuthorizationPort,
	ReceivablesPermission,
} from "@afenda/receivables";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createReceivablesAuthorizationPort(): ReceivablesAuthorizationPort {
	return {
		async can(input: {
			organizationId: string;
			actorUserId: string;
			permission: ReceivablesPermission;
		}) {
			return hasPermission({
				orgId: input.organizationId,
				userId: input.actorUserId,
				code: input.permission,
			});
		},
	};
}
