/**
 * Platform health probes — public api-now (REST-001 · ARCH-023 · PL-S8).
 * Runtime SSOT: `@afenda/admin/health` (real DB / auth-config probes + latencyMs).
 */

import { adminHealth } from "@afenda/admin/health";

export const getLivenessSnapshot = adminHealth.liveness;
export const getReadinessSnapshot = adminHealth.readiness;
export const inspectDatabaseConnection = adminHealth.database.inspect;
