import { errorResult, type Result } from "@afenda/errors";
import type { PayrollRunStatus } from "../../kernel/contracts/projected-types";

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
	_message = `Invalid payroll run transition from ${from} to ${to}`,
): Result<void> {
	if (isPayrollRunTransitionAllowed(from, to)) {
		return errorResult.ok(undefined);
	}
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}
