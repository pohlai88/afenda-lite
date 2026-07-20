import type { HttpHandler } from "./compose";
import { createHttpContext } from "./context";
import {
	type StampHttpResponseOptions,
	stampHttpResponse,
} from "./stamp-response";

export type WithHttpContextOptions = StampHttpResponseOptions;

/**
 * Wrap a terminal Fetch handler with context mint + response stamp
 * (correlation + Server-Timing). For multi-layer onions use `compose`
 * then stamp the terminal response (or put stamp as outermost middleware).
 */
export function withHttpContext(
	handler: HttpHandler,
	options?: WithHttpContextOptions,
): (request: Request) => Promise<Response> {
	return async (request) => {
		const ctx = createHttpContext(request);
		const response = await handler(request, ctx);
		return stampHttpResponse(response, ctx, options);
	};
}
