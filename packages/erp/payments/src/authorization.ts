import { fail, ok, type Result } from "@afenda/errors/result";

export type PaymentsPermission = "payments.read" | "payments.manage";

export type PaymentsAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: PaymentsPermission;
	}): Promise<boolean>;
};

export async function requirePaymentsPermission(
	authorization: PaymentsAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: PaymentsPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return fail("UNAUTHORIZED", "Payments authorization port is required", {
			permission: input.permission,
		});
	}
	if (!(await authorization.can(input))) {
		return fail("FORBIDDEN", "Missing required payments permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}
