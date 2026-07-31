import { errorIngress, errorResult, type Failure } from "@afenda/errors";

import type { RateLimitFailure } from "./types";

/** Map a failed rate-limit result into the canonical opaque failure boundary. */
export function toRateLimitFailure(
	result: RateLimitFailure,
): Failure<"RATE_LIMITED" | "SERVICE_UNAVAILABLE"> {
	switch (result.reason) {
		case "rate_limited":
			return errorIngress.code("RATE_LIMITED", {
				operation: "rate-limit.check",
				retryAfterSeconds: errorResult.retryAfterSeconds(
					result.retryAfterSeconds,
				),
			});
		case "unavailable":
			return errorIngress.code("SERVICE_UNAVAILABLE", {
				operation: "rate-limit.check",
			});
		default: {
			const _exhaustive: never = result;
			return _exhaustive;
		}
	}
}
