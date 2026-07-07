import { healthJson } from "@/lib/api/health-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight uptime probe — no env validation or dependency checks. */
export async function GET() {
  return healthJson({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
}
