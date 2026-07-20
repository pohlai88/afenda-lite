import { fail, ok, type Result } from "@afenda/errors/result";

export type PayablesPermission = "payables.read" | "payables.manage";

export type PayablesAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: PayablesPermission;
	}): Promise<boolean>;
};

export async function requirePayablesPermission(
	authorization: PayablesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: PayablesPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return fail("UNAUTHORIZED", "Payables authorization port is required", {
			permission: input.permission,
		});
	}
	if (!(await authorization.can(input))) {
		return fail("FORBIDDEN", "Missing required payables permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}
