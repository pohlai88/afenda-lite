import type { PayrollAuthorizationCapability } from "@afenda/payroll";

import { hasPermission } from "@/modules/identity/domain/has-permission";

export function createPayrollAuthorizationPort(): PayrollAuthorizationCapability {
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
