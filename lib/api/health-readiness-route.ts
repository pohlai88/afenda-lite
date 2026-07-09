import { healthJson } from "@/lib/api/health-response";
import { collectReadinessSnapshot } from "@/lib/api/readiness";

/** Shared handler for `GET /api/health/readiness`. */
export async function runHealthReadinessGet() {
  return healthJson(await collectReadinessSnapshot());
}
