import { healthJson } from "@/lib/api/health-response";
import { collectReadinessSnapshot } from "@/lib/api/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return healthJson(await collectReadinessSnapshot());
}
