import type { BucketPolicy } from "./semantic-registry";
import type { RateLimitQuotaProjection, StoreHitResult } from "./types";

function boundedInteger(
	value: number,
	minimum: number,
	maximum: number,
): number {
	if (!Number.isFinite(value)) {
		throw new TypeError("Rate-limit timing and quota values must be finite.");
	}
	return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

export function normalizeQuota(
	policy: BucketPolicy,
	input: Readonly<{ remaining: number; resetEpochMs: number }>,
	nowMs: number,
): RateLimitQuotaProjection {
	return Object.freeze({
		limit: policy.limit,
		remaining: boundedInteger(input.remaining, 0, policy.limit),
		resetEpochMs: boundedInteger(
			input.resetEpochMs,
			nowMs + 1000,
			nowMs + policy.windowMs,
		),
	});
}

export function retryAfterSecondsFromReset(
	policy: BucketPolicy,
	resetEpochMs: number,
	nowMs: number,
): number {
	return boundedInteger(
		Math.ceil((resetEpochMs - nowMs) / 1000),
		1,
		Math.ceil(policy.windowMs / 1000),
	);
}

export function normalizeUpstashResult(
	policy: BucketPolicy,
	input: unknown,
	nowMs: number,
): StoreHitResult {
	if (typeof input !== "object" || input === null) {
		throw new TypeError("Invalid Upstash rate-limit response.");
	}
	const success = Reflect.get(input, "success");
	const remaining = Reflect.get(input, "remaining");
	const reset = Reflect.get(input, "reset");
	if (
		typeof success !== "boolean" ||
		typeof remaining !== "number" ||
		typeof reset !== "number"
	) {
		throw new TypeError("Invalid Upstash rate-limit response.");
	}
	const quota = normalizeQuota(
		policy,
		{ remaining, resetEpochMs: reset },
		nowMs,
	);
	return success
		? Object.freeze({ allowed: true, quota })
		: Object.freeze({
				allowed: false,
				quota,
				retryAfterSeconds: retryAfterSecondsFromReset(
					policy,
					quota.resetEpochMs,
					nowMs,
				),
			});
}
