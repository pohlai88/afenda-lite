import { runHealthReadinessGet } from "@/lib/api/health-readiness-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return runHealthReadinessGet();
}
