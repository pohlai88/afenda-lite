import { jsonData } from "@/modules/platform/api/json-response";
import { getLivenessSnapshot } from "@/modules/platform/domain/health";

/**
 * GET /api/health/liveness — public process-up probe (REST-001 api-now).
 */
export function GET() {
	return jsonData(getLivenessSnapshot(), {
		headers: {
			"Cache-Control": "public, max-age=10",
		},
	});
}
