import { runHealthReadinessGet } from "@/modules/platform/api/health-readiness-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health/readiness — public DB / deps probe. */
export async function GET() {
  return runHealthReadinessGet();
}
