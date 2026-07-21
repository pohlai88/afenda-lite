import type { HumanResourcesAuthorizationPort } from "@afenda/human-resources";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createHumanResourcesAuthorizationPort(): HumanResourcesAuthorizationPort {
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
