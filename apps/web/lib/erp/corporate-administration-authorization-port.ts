import type { CorporateAdministrationAuthorizationContext } from "@afenda/corporate-administration";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createCorporateAdministrationAuthorizationPort(): CorporateAdministrationAuthorizationContext {
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
