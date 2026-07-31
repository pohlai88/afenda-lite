import { toNonNegativeInteger } from "./non-negative-integer";
import { HTTP_SEMANTIC_REGISTRY } from "./semantic-registry";

/** Attach caller-supplied Retry-After delta seconds. Error retry policy stays in @afenda/errors. */
export function applyRetryAfterHeader(headers: Headers, seconds: number): void {
	headers.set(
		HTTP_SEMANTIC_REGISTRY.headers.retryAfter,
		String(toNonNegativeInteger(seconds, "Retry-After seconds")),
	);
}
