export interface ExponentialRetryPolicy {
	baseDelayMs: number;
	maxAttempts: number;
	maxDelayMs: number;
	multiplier: number;
}

export const DEFAULT_EXPONENTIAL_RETRY_POLICY: ExponentialRetryPolicy = {
	maxAttempts: 5,
	baseDelayMs: 1000,
	maxDelayMs: 60_000,
	multiplier: 2,
};

export function validateRetryPolicy(policy: ExponentialRetryPolicy): boolean {
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

export function retryDelayMs(
	policy: ExponentialRetryPolicy,
	completedAttemptCount: number,
): number {
	if (!validateRetryPolicy(policy)) {
		throw new Error("Invalid exponential retry policy");
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
