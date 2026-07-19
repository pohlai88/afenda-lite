import { jsonData } from "@/modules/platform/api/json-response";
import { createPlatformRouteHandler } from "@/modules/platform/api/route-pipeline";
import { getLivenessSnapshot } from "@/modules/platform/domain/health";

/**
 * GET /api/health/liveness — public process-up probe (REST-001 api-now).
 */
export const GET = createPlatformRouteHandler(
	async () =>
		jsonData(getLivenessSnapshot(), {
			headers: {
				"Cache-Control": "public, max-age=10",
			},
		}),
	{
		serverTimingMetric: "health_liveness",
		routeTemplate: "/api/health/liveness",
	},
);
