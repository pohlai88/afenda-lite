import type { PayrollPeriod } from "../../kernel/contracts/projected-types";

const TERMINAL_EMPLOYMENT_STATUSES = new Set(["notice", "terminated"]);

export function isTerminalEmploymentStatus(
	status: string | undefined,
): boolean {
	return status !== undefined && TERMINAL_EMPLOYMENT_STATUSES.has(status);
}

export function isPeriodAcceptingHandoffs(
	status: PayrollPeriod["status"],
): boolean {
	return status === "open";
}

export function periodMatchesHandoff(
	period: PayrollPeriod,
	input: {
		effectiveDate: string;
		periodEnd: string | null;
		periodStart: string | null;
	},
): boolean {
	if (input.periodStart !== null && input.periodEnd !== null) {
		return (
			period.periodStart === input.periodStart &&
			period.periodEnd === input.periodEnd
		);
	}
	return (
		period.periodStart <= input.effectiveDate &&
		input.effectiveDate <= period.periodEnd
	);
}

export const MID_PERIOD_TERMINATION_EXCEPTION_CODE = "MID_PERIOD_TERMINATION";
