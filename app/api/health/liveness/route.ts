import { runHealthLivenessGet } from "@/modules/platform/api/health-liveness-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health/liveness — public process uptime probe. */
export async function GET() {
  return runHealthLivenessGet();
}
