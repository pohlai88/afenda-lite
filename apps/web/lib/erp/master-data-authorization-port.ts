import type { MasterAuthorizationPort } from "@afenda/master-data";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createMasterDataAuthorizationPort(): MasterAuthorizationPort {
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
