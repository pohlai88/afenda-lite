import { type AppError, rateLimited, serviceUnavailable } from "@afenda/errors";

import type { RateLimitFailure } from "./types";

/** Map a failed `checkRateLimit` result to the shared AppError vocabulary. */
export function toRateLimitAppError(result: RateLimitFailure): AppError {
	switch (result.reason) {
		case "rate_limited":
			return rateLimited(result.retryAfterSeconds);
		case "unavailable":
			return serviceUnavailable(result.service);
		default: {
			const _exhaustive: never = result;
			return _exhaustive;
		}
	}
}
