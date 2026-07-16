/**
 * Neon recovery posture targets + read-only API evaluation (N3).
 * Living authority: RB-001 · ARCH-025 · ARCH-023.
 * Does not perform restore / reset / snapshot delete.
 *
 * Branch id mirrors `APPROVED_NEON_BRANCH_ID` in neon-contract (kept local so
 * `validate-neon-env` can strip-types-load this file without nested ESM resolution).
 */

/** Must stay equal to `APPROVED_NEON_BRANCH_ID` (enforced in tests). */
export const RECOVERY_PROD_BRANCH_ID = "br-tiny-hill-ao82jp6f" as const;

/** Launch plan maximum PITR window (7 days). */
export const TARGET_HISTORY_RETENTION_SECONDS = 604_800 as const;

/** Daily scheduled snapshots — hour UTC (RB-001). */
export const TARGET_SNAPSHOT_HOUR_UTC = 17 as const;

/** Scheduled snapshot retention (days). */
export const TARGET_SNAPSHOT_RETAIN_DAYS = 14 as const;

/**
 * RPO — PITR path: restore timestamp may be within this lag of last known-good
 * write inside the history window (operational objective).
 */
export const TARGET_RPO_PITR_SECONDS = 60 as const;

/**
 * RPO — scheduled snapshot fallback: bounded by daily schedule.
 */
export const TARGET_RPO_SNAPSHOT_HOURS = 24 as const;

/**
 * RTO — ephemeral restore drill (finalize_restore=false): wall-clock from
 * restore start to SQL integrity PASS on the drill branch.
 */
export const TARGET_RTO_DRILL_MINUTES = 30 as const;

/** Max age of latest scheduled snapshot before validate fails (daily + slack). */
export const MAX_SCHEDULED_SNAPSHOT_AGE_HOURS = 26 as const;

export type NeonRecoveryIssue = {
	check: string;
	message: string;
};

export type NeonRecoveryCheckResult = {
	ok: boolean;
	issues: NeonRecoveryIssue[];
	detail: string;
};

export type NeonProjectRecoveryInput = {
	history_retention_seconds?: number | null;
};

export type NeonBranchRecoveryInput = {
	id?: string | null;
	protected?: boolean | null;
	default?: boolean | null;
	primary?: boolean | null;
	name?: string | null;
};

export type NeonSnapshotRecoveryInput = {
	id?: string | null;
	name?: string | null;
	created_at?: string | null;
	expires_at?: string | null;
	source_branch_id?: string | null;
	branch_id?: string | null;
};

export function formatNeonRecoveryIssues(issues: NeonRecoveryIssue[]): string {
	return issues.map((issue) => `${issue.check}: ${issue.message}`).join("; ");
}

export function evaluateHistoryRetention(
	project: NeonProjectRecoveryInput,
): NeonRecoveryCheckResult {
	const actual = project.history_retention_seconds;
	if (actual === TARGET_HISTORY_RETENTION_SECONDS) {
		return {
			ok: true,
			issues: [],
			detail: `history_retention_seconds=${actual} (7d target)`,
		};
	}
	return {
		ok: false,
		issues: [
			{
				check: "history_retention_seconds",
				message: `expected ${TARGET_HISTORY_RETENTION_SECONDS}, got ${String(actual)}`,
			},
		],
		detail: `history_retention_seconds mismatch (got ${String(actual)})`,
	};
}

export function evaluateProtectedProductionBranch(
	branch: NeonBranchRecoveryInput,
	expectedBranchId: string = RECOVERY_PROD_BRANCH_ID,
): NeonRecoveryCheckResult {
	const issues: NeonRecoveryIssue[] = [];
	if (branch.id !== expectedBranchId) {
		issues.push({
			check: "branch.id",
			message: `expected ${expectedBranchId}, got ${String(branch.id)}`,
		});
	}
	if (branch.protected !== true) {
		issues.push({
			check: "branch.protected",
			message: `expected true, got ${String(branch.protected)}`,
		});
	}
	if (branch.default !== true) {
		issues.push({
			check: "branch.default",
			message: `expected true, got ${String(branch.default)}`,
		});
	}
	if (issues.length === 0) {
		return {
			ok: true,
			issues: [],
			detail: `${branch.name ?? "branch"} protected=true default=true`,
		};
	}
	return {
		ok: false,
		issues,
		detail: formatNeonRecoveryIssues(issues),
	};
}

/** Scheduled Neon snapshots use names like `snapshot_2026-07-16T17:00:05Z`. */
export function isScheduledSnapshotName(
	name: string | null | undefined,
): boolean {
	return Boolean(name?.startsWith("snapshot_"));
}

export function snapshotSourceBranchId(
	snapshot: NeonSnapshotRecoveryInput,
): string | null {
	return snapshot.source_branch_id ?? snapshot.branch_id ?? null;
}

export function scheduledSnapshotRetainDays(
	snapshot: NeonSnapshotRecoveryInput,
): number | null {
	if (!snapshot.created_at || !snapshot.expires_at) {
		return null;
	}
	const created = Date.parse(snapshot.created_at);
	const expires = Date.parse(snapshot.expires_at);
	if (Number.isNaN(created) || Number.isNaN(expires) || expires <= created) {
		return null;
	}
	const days = (expires - created) / (24 * 60 * 60 * 1000);
	return Math.round(days);
}

export function scheduledSnapshotHourUtc(
	snapshot: NeonSnapshotRecoveryInput,
): number | null {
	if (!snapshot.created_at) {
		return null;
	}
	const created = Date.parse(snapshot.created_at);
	if (Number.isNaN(created)) {
		return null;
	}
	return new Date(created).getUTCHours();
}

/**
 * Evaluate snapshot inventory as schedule evidence.
 * Neon has no reliable public snapshot_schedules route (404 observed) —
 * do not invent a schedule-API PASS; infer from inventory only.
 */
export function evaluateScheduledSnapshotInventory(
	snapshots: NeonSnapshotRecoveryInput[],
	options: {
		nowMs?: number;
		expectedBranchId?: string;
		maxAgeHours?: number;
	} = {},
): NeonRecoveryCheckResult {
	const nowMs = options.nowMs ?? Date.now();
	const expectedBranchId = options.expectedBranchId ?? RECOVERY_PROD_BRANCH_ID;
	const maxAgeHours = options.maxAgeHours ?? MAX_SCHEDULED_SNAPSHOT_AGE_HOURS;
	const issues: NeonRecoveryIssue[] = [];

	const scheduled = snapshots
		.filter((snap) => isScheduledSnapshotName(snap.name))
		.filter((snap) => {
			const source = snapshotSourceBranchId(snap);
			return source == null || source === expectedBranchId;
		})
		.sort(
			(a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""),
		);

	if (scheduled.length === 0) {
		return {
			ok: false,
			issues: [
				{
					check: "snapshots.scheduled",
					message:
						"no scheduled snapshot_* rows for production branch — Console verify required",
				},
			],
			detail: "no scheduled snapshots in inventory",
		};
	}

	const latest = scheduled[0];
	if (!latest) {
		return {
			ok: false,
			issues: [
				{
					check: "snapshots.scheduled",
					message:
						"no scheduled snapshot_* rows for production branch — Console verify required",
				},
			],
			detail: "no scheduled snapshots in inventory",
		};
	}

	const hour = scheduledSnapshotHourUtc(latest);
	if (hour !== TARGET_SNAPSHOT_HOUR_UTC) {
		issues.push({
			check: "snapshots.hour_utc",
			message: `latest scheduled hour UTC expected ${TARGET_SNAPSHOT_HOUR_UTC}, got ${String(hour)}`,
		});
	}

	const retainDays = scheduledSnapshotRetainDays(latest);
	if (retainDays !== TARGET_SNAPSHOT_RETAIN_DAYS) {
		issues.push({
			check: "snapshots.retain_days",
			message: `latest scheduled retain days expected ${TARGET_SNAPSHOT_RETAIN_DAYS}, got ${String(retainDays)}`,
		});
	}

	const createdMs = Date.parse(latest.created_at ?? "");
	if (Number.isNaN(createdMs)) {
		issues.push({
			check: "snapshots.created_at",
			message: "latest scheduled snapshot missing created_at",
		});
	} else {
		const ageHours = (nowMs - createdMs) / (60 * 60 * 1000);
		if (ageHours > maxAgeHours) {
			issues.push({
				check: "snapshots.freshness",
				message: `latest scheduled snapshot age ${ageHours.toFixed(1)}h exceeds ${maxAgeHours}h`,
			});
		}
	}

	const detail = `latest=${latest.id ?? "unknown"} created=${latest.created_at ?? "unknown"} (inventory inference — no schedule API)`;

	if (issues.length > 0) {
		return { ok: false, issues, detail };
	}
	return { ok: true, issues: [], detail };
}
