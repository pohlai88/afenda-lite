import type { HttpContext } from "./context";
import { CORRELATION_HEADER } from "./correlation";
import { applyServerTimingHeader } from "./server-timing";

export type StampHttpResponseOptions = {
	readonly includeServerTiming?: boolean;
	readonly serverTimingMetric?: string;
};

/**
 * Stamp correlation (+ optional Server-Timing) onto a Fetch Response in place.
 * Mutates `response.headers` — callers that need an immutable clone must clone first.
 */
export function stampHttpResponse(
	response: Response,
	ctx: HttpContext,
	options?: StampHttpResponseOptions,
): Response {
	response.headers.set(CORRELATION_HEADER, ctx.correlationId);
	if (options?.includeServerTiming !== false) {
		applyServerTimingHeader(response.headers, ctx.startTime, {
			...(options?.serverTimingMetric !== undefined
				? { metric: options.serverTimingMetric }
				: {}),
		});
	}
	return response;
}
