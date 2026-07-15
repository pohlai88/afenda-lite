import { jsonData } from "@/modules/platform/api/json-response";
import { getReadinessSnapshot } from "@/modules/platform/domain/health";

/**
 * GET /api/health/readiness — DB / auth dependency snapshot (REST-001 api-now).
 */
export async function GET() {
	const snapshot = await getReadinessSnapshot();
	return jsonData(snapshot, {
		headers: {
			"Cache-Control": "no-store",
		},
	});
}
