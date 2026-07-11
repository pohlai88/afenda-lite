import { healthJson } from "@/modules/platform/api/health-response";
import { collectReadinessSnapshot } from "@/modules/platform/api/readiness";

/** Shared handler for `GET /api/health/readiness`. */
export async function runHealthReadinessGet() {
  return healthJson(await collectReadinessSnapshot());
}
