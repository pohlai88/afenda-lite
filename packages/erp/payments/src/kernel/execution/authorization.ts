import { errorResult, type Result } from "@afenda/errors";

import type { PaymentsPermission } from "./permissions";

export type { PaymentsPermission } from "./permissions";

export interface PaymentsAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: PaymentsPermission;
	}) => Promise<boolean>;
}

export async function requirePaymentsPermission(
	authorization: PaymentsAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: PaymentsPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return errorResult.fail("UNAUTHORIZED");
	}
	if (!(await authorization.can(input))) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.ok(undefined);
}
