import { fail, ok, type Result } from "@afenda/errors/result";

export type AccountingPermission = "accounting.read" | "accounting.manage";

export type AccountingAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: AccountingPermission;
	}): Promise<boolean>;
};

export async function requireAccountingPermission(
	authorization: AccountingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: AccountingPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return fail("UNAUTHORIZED", "Accounting authorization port is required", {
			permission: input.permission,
		});
	}
	if (!(await authorization.can(input))) {
		return fail("FORBIDDEN", "Missing required accounting permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}
