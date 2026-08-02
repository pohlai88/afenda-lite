import { errorResult, type Result } from "@afenda/errors";

export type PayablesPermission = "payables.read" | "payables.manage";

export interface PayablesAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: PayablesPermission;
	}) => Promise<boolean>;
}

export async function requirePayablesPermission(
	authorization: PayablesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: PayablesPermission;
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
