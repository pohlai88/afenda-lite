import { type HttpHandler, type HttpMiddleware, http } from "@afenda/http";
import { metrics } from "@afenda/metrics";
import { type CorsConfig, security } from "@afenda/security";

export interface PlatformRouteOptions {
	/** When set, OPTIONS short-circuits and allow-listed origins get CORS headers. */
	readonly cors?: CorsConfig;
	/**
	 * Static route template for Prometheus HTTP metrics.
	 * Required — never pass raw URLs or query strings.
	 */
	readonly routeTemplate: string;
	readonly serverTimingMetric?: string;
}

function corsMiddleware(config: CorsConfig): HttpMiddleware {
	return async (request, ctx, next) => {
		const preflight = security.cors.preflight({ request, config });
		if (preflight !== null) {
			return preflight;
		}

		const response = await next(request, ctx);
		const corsHeaders = security.cors.project({
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
		? http.pipeline.compose(corsMiddleware(options.cors), handler)
		: handler;

	const withContext = http.pipeline.withContext(terminal, {
		...(options.serverTimingMetric === undefined
			? {}
			: { serverTimingMetric: options.serverTimingMetric }),
	});

	return async (request) => {
		const started = performance.now();
		const response = await withContext(request);
		metrics.record.http({
			method: request.method,
			routeTemplate: options.routeTemplate,
			statusCode: response.status,
			durationSeconds: (performance.now() - started) / 1000,
		});
		return response;
	};
}
