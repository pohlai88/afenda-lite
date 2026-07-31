import { errorIngress, errorResult, type Failure } from "@afenda/errors";

import { metadataFor } from "./decision";
import type {
	RateLimitDecision,
	RateLimitDiagnosticsProjection,
	RateLimitQuotaProjection,
	RateLimitRejectedDecision,
} from "./types";

function quota(
	decision: RateLimitDecision,
): RateLimitQuotaProjection | undefined {
	const metadata = metadataFor(decision);
	return metadata.outcome === "unavailable" ? undefined : metadata.quota;
}

function failure(
	decision: RateLimitRejectedDecision,
): Failure<"RATE_LIMITED" | "SERVICE_UNAVAILABLE"> {
	const metadata = metadataFor(decision);
	if (metadata.outcome === "rate_limited") {
		return errorIngress.code("RATE_LIMITED", {
			operation: "rate-limit.check",
			retryAfterSeconds: errorResult.retryAfterSeconds(
				metadata.retryAfterSeconds,
			),
		});
	}
	if (metadata.outcome === "unavailable") {
		return errorIngress.code("SERVICE_UNAVAILABLE", {
			operation: "rate-limit.check",
		});
	}
	throw new TypeError(
		"Allowed rate-limit decisions have no failure projection.",
	);
}

function diagnostics(
	decision: RateLimitDecision,
): RateLimitDiagnosticsProjection {
	const metadata = metadataFor(decision);
	return Object.freeze(
		metadata.outcome === "unavailable"
			? { outcome: metadata.outcome, service: metadata.service }
			: { outcome: metadata.outcome },
	);
}

export const rateLimitProject = Object.freeze({
	diagnostics,
	failure,
	quota,
});
