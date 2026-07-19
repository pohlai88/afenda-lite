import "server-only";

/**
 * Health-only public surface — no org-console / Neon Auth client load.
 * Prefer `@afenda/admin/health` for readiness / liveness callers.
 */
export {
	getHealthAggregate,
	getLivenessSnapshot,
	getReadinessSnapshot,
	inspectDatabaseConnection,
} from "./health";
export type {
	HealthAggregate,
	LivenessResponse,
	ReadinessResponse,
} from "./schemas/health";
