import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "@afenda/env";
import { errorResult } from "@afenda/errors";
import { metrics } from "@afenda/metrics/node";

import { jsonFailure } from "@/modules/platform/api/json-response";
import { createPlatformRouteHandler } from "@/modules/platform/api/route-pipeline";

// Explicitly declare Node runtime for Prometheus metrics
export const runtime = "nodejs";

const METRICS_ROUTE_TEMPLATE = "/api/metrics" as const;
const BEARER_TOKEN_PATTERN = /^Bearer\s+(\S+)$/i;

function extractBearerToken(authorization: string | null): string | null {
	if (authorization === null) {
		return null;
	}
	const match = BEARER_TOKEN_PATTERN.exec(authorization.trim());
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
			return jsonFailure(
				errorResult.fail("NOT_FOUND", {
					publicMessage: "Metrics endpoint is not available.",
				}),
			);
		}

		const provided = extractBearerToken(request.headers.get("Authorization"));
		if (provided === null || !tokensEqual(configured, provided)) {
			return jsonFailure(errorResult.fail("UNAUTHORIZED"), {
				headers: {
					"WWW-Authenticate": 'Bearer realm="metrics"',
					"Cache-Control": "no-store",
				},
			});
		}

		const body = await metrics.exposition.render();
		return new Response(body, {
			status: 200,
			headers: {
				"Content-Type": metrics.exposition.contentType,
				"Cache-Control": "no-store",
			},
		});
	},
	{
		serverTimingMetric: "metrics_scrape",
		routeTemplate: METRICS_ROUTE_TEMPLATE,
	},
);
