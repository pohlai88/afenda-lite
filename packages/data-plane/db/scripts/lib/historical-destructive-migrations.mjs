import { createHash } from "node:crypto";

/**
 * Immutable evidence for destructive migrations that were applied before the
 * additive-first gate existed. An entry authorizes recognition of the exact
 * historical bytes only. It does not authorize mutation, manual re-execution,
 * imitation by another migration, or a general destructive-migration bypass.
 */
export const APPROVED_HISTORICAL_DESTRUCTIVE_MIGRATIONS = Object.freeze({
	"0041_sales_rebuild_20260728.sql": Object.freeze({
		appliedHash:
			"796f5a60f96645e122164749b224359bf187e0e086f498382b9e9b98a8750fbc",
		appliedCommit: "67fefe31c5bd61887ddb41a4b76b09a6f53577af",
		reason:
			"Historical Sales rebuild applied before immutable destructive-migration enforcement.",
		status: "historical-applied-exception",
		approvedBy: "DB-MVP-READINESS-01 approval, 2026-07-30",
	}),
});

/**
 * @param {string} filename
 * @param {string} sql
 */
export function findApprovedHistoricalDestructiveMigration(filename, sql) {
	const approval = APPROVED_HISTORICAL_DESTRUCTIVE_MIGRATIONS[filename];
	if (!approval) {
		return null;
	}
	const hash = createHash("sha256").update(sql).digest("hex");
	return hash === approval.appliedHash ? approval : null;
}
