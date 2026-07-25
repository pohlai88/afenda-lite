import type { CorporateAdministrationAuthorizationPort } from "@afenda/corporate-administration";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createCorporateAdministrationAuthorizationPort(): CorporateAdministrationAuthorizationPort {
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
