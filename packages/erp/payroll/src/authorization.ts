import { fail, ok, type Result } from "@afenda/errors/result";

import { payrollModuleManifest } from "./module.manifest";
import type { PayrollCommandId, PayrollQueryId } from "./module-ids";
import type { PAYROLL_PERMISSION_CODES } from "./permissions";

export type PayrollPermission = (typeof PAYROLL_PERMISSION_CODES)[number];

export type PayrollAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: PayrollPermission;
	}): Promise<boolean>;
};

export async function requirePayrollCommandPermission(
	authorization: PayrollAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: PayrollCommandId;
	},
): Promise<Result<void>> {
	const permission =
		payrollModuleManifest.authorization.commands[input.command];
	return requirePayrollPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export async function requirePayrollQueryPermission(
	authorization: PayrollAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: PayrollQueryId;
	},
): Promise<Result<void>> {
	const permission = payrollModuleManifest.authorization.queries[input.query];
	return requirePayrollPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

async function requirePayrollPermission(
	authorization: PayrollAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: PayrollPermission;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail("UNAUTHORIZED", "Payroll authorization port is required", {
			permission: input.permission,
		});
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return fail("FORBIDDEN", "Missing required payroll permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}
