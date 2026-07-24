import { fail, ok, type Result } from "@afenda/errors/result";

import {
	PAYROLL_ERROR_INVALID_STATE,
	payrollErrorDetails,
} from "../error-codes";
import type { PayrollRunStatus } from "../types";

const ALLOWED_TRANSITIONS: Readonly<
	Partial<Record<PayrollRunStatus, readonly PayrollRunStatus[]>>
> = {
	draft: ["calculating"],
	failed: ["calculating"],
	calculating: ["calculated", "failed"],
	calculated: ["finalized"],
	finalized: ["reversed"],
};

export function isPayrollRunTransitionAllowed(
	from: PayrollRunStatus,
	to: PayrollRunStatus,
): boolean {
	if (from === to) {
		return true;
	}
	const allowed = ALLOWED_TRANSITIONS[from];
	return allowed?.includes(to) ?? false;
}

export function assertPayrollRunTransition(
	from: PayrollRunStatus,
	to: PayrollRunStatus,
	message = `Invalid payroll run transition from ${from} to ${to}`,
): Result<void> {
	if (isPayrollRunTransitionAllowed(from, to)) {
		return ok(undefined);
	}
	return fail("CONFLICT", message, payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE));
}
