import { jsonData } from "@/modules/platform/api/json-response";
import { createPlatformRouteHandler } from "@/modules/platform/api/route-pipeline";
import { getReadinessSnapshot } from "@/modules/platform/domain/health";

/**
 * GET /api/health/readiness — DB / auth dependency snapshot (REST-001 api-now).
 */
export const GET = createPlatformRouteHandler(
	async () => {
		const snapshot = await getReadinessSnapshot();
		return jsonData(snapshot, {
			status: snapshot.status === "not_ready" ? 503 : 200,
			headers: {
				"Cache-Control": "no-store",
			},
		});
	},
	{
		serverTimingMetric: "health_readiness",
		routeTemplate: "/api/health/readiness",
	},
);
