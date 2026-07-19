import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "@afenda/env";
import { PROMETHEUS_CONTENT_TYPE, renderPrometheusText } from "@afenda/metrics";

import { createPlatformRouteHandler } from "@/modules/platform/api/route-pipeline";

const METRICS_ROUTE_TEMPLATE = "/api/metrics" as const;

function extractBearerToken(authorization: string | null): string | null {
	if (authorization === null) {
		return null;
	}
	const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
	return match?.[1] ?? null;
}

/** Constant-time compare via SHA-256 digests (avoids token-length oracle). */
function tokensEqual(expected: string, provided: string): boolean {
	const expectedHash = createHash("sha256").update(expected, "utf8").digest();
	const providedHash = createHash("sha256").update(provided, "utf8").digest();
	return timingSafeEqual(expectedHash, providedHash);
}

/**
 * GET /api/metrics — Prometheus scrape (fail closed without METRICS_SCRAPE_TOKEN).
 */
export const GET = createPlatformRouteHandler(
	async (request) => {
		const configured = env.METRICS_SCRAPE_TOKEN;
		if (configured === undefined) {
			return new Response(null, { status: 404 });
		}

		const provided = extractBearerToken(request.headers.get("Authorization"));
		if (provided === null || !tokensEqual(configured, provided)) {
			return new Response(null, {
				status: 401,
				headers: {
					"WWW-Authenticate": 'Bearer realm="metrics"',
					"Cache-Control": "no-store",
				},
			});
		}

		const body = await renderPrometheusText();
		return new Response(body, {
			status: 200,
			headers: {
				"Content-Type": PROMETHEUS_CONTENT_TYPE,
				"Cache-Control": "no-store",
			},
		});
	},
	{
		serverTimingMetric: "metrics_scrape",
		routeTemplate: METRICS_ROUTE_TEMPLATE,
	},
);
