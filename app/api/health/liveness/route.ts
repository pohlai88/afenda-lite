import { runHealthLivenessGet } from "@/lib/api/health-liveness-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight uptime probe — no env validation or dependency checks. */
export async function GET() {
  return runHealthLivenessGet();
}
