/**
 * Platform health probes — public api-now (REST-001 · ARCH-023 · PL-S8).
 * Runtime SSOT: `@afenda/admin/health` (real DB / auth-config probes + latencyMs).
 */

export {
	getLivenessSnapshot,
	getReadinessSnapshot,
	inspectDatabaseConnection,
} from "@afenda/admin/health";
