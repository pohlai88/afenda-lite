export type { RateLimitCheckInput } from "./semantic-registry";
export type {
	RateLimitAllowedDecision,
	RateLimitDecision,
	RateLimitDiagnosticsProjection,
	RateLimitOutcome,
	RateLimitQuotaProjection,
	RateLimitRejectedDecision,
} from "./types";

import { checkRateLimit } from "./check";
import { rateLimitProject } from "./projection";

/** Permanent consumer facade for quota decisions and owner-derived projections. */
export const rateLimit = Object.freeze({
	check: checkRateLimit,
	project: rateLimitProject,
});
