import { healthJson } from "@/lib/api/health-response";

/** Shared handler for `GET /api/health/liveness`. */
export function runHealthLivenessGet() {
  return healthJson({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
}
