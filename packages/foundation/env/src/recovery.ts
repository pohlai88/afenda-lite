/**
 * @afenda/env
 * Contract: ENV-EXPORTS-RECOVERY
 * Protected: changes require local pre-edit token and compatibility checks.
 *
 * Public entrypoint: `@afenda/env/recovery`.
 *
 * Read-only Neon recovery posture evaluators for operations tooling. This
 * entrypoint evaluates supplied evidence only — it never restores branches,
 * deletes snapshots, or mutates retention.
 */

export {
	evaluateHistoryRetention,
	evaluateProtectedProductionBranch,
	evaluateScheduledSnapshotInventory,
	formatNeonRecoveryIssues,
	isScheduledSnapshotName,
	MAX_FUTURE_TIMESTAMP_SKEW_MINUTES,
	MAX_SCHEDULED_SNAPSHOT_AGE_HOURS,
	MAX_SNAPSHOT_NAME_CREATED_AT_DRIFT_SECONDS,
	MAX_SNAPSHOT_SCHEDULE_DRIFT_MINUTES,
	type NeonBranchRecoveryInput,
	type NeonProjectRecoveryInput,
	type NeonRecoveryCheckResult,
	type NeonRecoveryIssue,
	type NeonSnapshotRecoveryInput,
	RECOVERY_PROD_BRANCH_ID,
	scheduledSnapshotHourUtc,
	scheduledSnapshotMinuteOfDayUtc,
	scheduledSnapshotNameTimestamp,
	scheduledSnapshotRetainDays,
	snapshotSourceBranchId,
	TARGET_HISTORY_RETENTION_SECONDS,
	TARGET_SNAPSHOT_HOUR_UTC,
	TARGET_SNAPSHOT_RETAIN_DAYS,
} from "./neon-recovery-posture";
