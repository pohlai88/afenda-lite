import { errorResult, type Result } from "@afenda/errors";

import type {
	PayrollCommandId,
	PayrollQueryId,
} from "../operations/module-ids";
import {
	PAYROLL_COMMAND_AUTHORIZATION,
	PAYROLL_QUERY_AUTHORIZATION,
} from "../operations/registry";
import type { PayrollPermission } from "./permissions";

export type { PayrollPermission } from "./permissions";

export interface PayrollAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: PayrollPermission;
	}) => Promise<boolean>;
}

export function requirePayrollCommandPermission(
	authorization: PayrollAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: PayrollCommandId;
	},
): Promise<Result<void>> {
	const permission = PAYROLL_COMMAND_AUTHORIZATION[input.command];
	return requirePayrollPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export function requirePayrollQueryPermission(
	authorization: PayrollAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: PayrollQueryId;
	},
): Promise<Result<void>> {
	const permission = PAYROLL_QUERY_AUTHORIZATION[input.query];
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
		return errorResult.fail("UNAUTHORIZED");
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.ok(undefined);
}
