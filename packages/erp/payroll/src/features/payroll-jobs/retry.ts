export interface PayrollJobRetryPolicy {
	baseDelayMs: number;
	maxAttempts: number;
	maxDelayMs: number;
	multiplier: number;
}

export const DEFAULT_PAYROLL_JOB_RETRY_POLICY: PayrollJobRetryPolicy = {
	maxAttempts: 5,
	baseDelayMs: 1000,
	maxDelayMs: 60_000,
	multiplier: 2,
};

export const DEFAULT_PAYROLL_JOB_CHUNK_SIZE = 1000;
export const MAX_PAYROLL_JOB_EMPLOYEES = 50_000;
export const DEFAULT_PAYROLL_JOB_LEASE_MS = 60_000;

export function validatePayrollJobRetryPolicy(
	policy: PayrollJobRetryPolicy,
): boolean {
	return (
		Number.isInteger(policy.maxAttempts) &&
		policy.maxAttempts >= 1 &&
		policy.maxAttempts <= 20 &&
		Number.isFinite(policy.baseDelayMs) &&
		policy.baseDelayMs >= 1 &&
		Number.isFinite(policy.maxDelayMs) &&
		policy.maxDelayMs >= policy.baseDelayMs &&
		Number.isFinite(policy.multiplier) &&
		policy.multiplier >= 1
	);
}

export function payrollJobRetryDelayMs(
	policy: PayrollJobRetryPolicy,
	completedAttemptCount: number,
): number {
	if (!validatePayrollJobRetryPolicy(policy)) {
		throw new Error("Invalid payroll job retry policy");
	}
	if (!Number.isInteger(completedAttemptCount) || completedAttemptCount < 1) {
		throw new Error("Completed attempt count must be positive");
	}
	return Math.min(
		policy.maxDelayMs,
		Math.round(
			policy.baseDelayMs *
				policy.multiplier ** Math.max(0, completedAttemptCount - 1),
		),
	);
}
