import type { PayrollAuthorizationPort } from "@afenda/payroll";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createPayrollAuthorizationPort(): PayrollAuthorizationPort {
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
