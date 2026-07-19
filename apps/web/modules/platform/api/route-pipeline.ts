import type { HttpHandler, HttpMiddleware } from "@afenda/http";
import { compose, withHttpContext } from "@afenda/http";
import { recordHttpRequest } from "@afenda/metrics";
import {
	buildCorsHeaders,
	type CorsConfig,
	handleCorsPreflight,
} from "@afenda/security";

export type PlatformRouteOptions = {
	/**
	 * Static route template for Prometheus HTTP metrics.
	 * Required — never pass raw URLs or query strings.
	 */
	readonly routeTemplate: string;
	readonly serverTimingMetric?: string;
	/** When set, OPTIONS short-circuits and allow-listed origins get CORS headers. */
	readonly cors?: CorsConfig;
};

function corsMiddleware(config: CorsConfig): HttpMiddleware {
	return async (request, ctx, next) => {
		const preflight = handleCorsPreflight({ request, config });
		if (preflight !== null) {
			return preflight;
		}

		const response = await next(request, ctx);
		const corsHeaders = buildCorsHeaders({
			config,
			requestOrigin: request.headers.get("Origin"),
		});
		for (const [key, value] of corsHeaders.entries()) {
			response.headers.set(key, value);
		}
		return response;
	};
}

/**
 * Living Route Handler wrapper: mint `HttpContext`, run optional onion layers,
 * stamp `x-correlation-id` + `Server-Timing` on the way out, then record
 * Prometheus HTTP metrics for `routeTemplate`.
 * CORS is opt-in via `cors` — same-origin health/auth BFF leave it unset.
 */
export function createPlatformRouteHandler(
	handler: HttpHandler,
	options: PlatformRouteOptions,
): (request: Request) => Promise<Response> {
	const terminal = options.cors
		? compose(corsMiddleware(options.cors), handler)
		: handler;

	const withContext = withHttpContext(terminal, {
		...(options.serverTimingMetric !== undefined
			? { serverTimingMetric: options.serverTimingMetric }
			: {}),
	});

	return async (request) => {
		const started = performance.now();
		const response = await withContext(request);
		recordHttpRequest({
			method: request.method,
			routeTemplate: options.routeTemplate,
			statusCode: response.status,
			durationSeconds: (performance.now() - started) / 1000,
		});
		return response;
	};
}
