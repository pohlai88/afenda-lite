import { fail, ok, type Result } from "@afenda/errors/result";

export type ReceivablesPermission = "receivables.read" | "receivables.manage";

export type ReceivablesAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivablesPermission;
	}): Promise<boolean>;
};

export async function requireReceivablesPermission(
	authorization: ReceivablesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivablesPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return fail("UNAUTHORIZED", "Receivables authorization port is required", {
			permission: input.permission,
		});
	}
	if (!(await authorization.can(input))) {
		return fail("FORBIDDEN", "Missing required receivables permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}
