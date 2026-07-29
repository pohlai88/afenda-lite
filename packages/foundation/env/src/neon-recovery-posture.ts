/**
 * Neon recovery posture targets and read-only API evaluation (N3).
 *
 * Living authority: RB-001 · ARCH-025 · ARCH-023.
 *
 * This module evaluates recovery evidence only. It does not restore branches,
 * reset data, delete snapshots, mutate retention, or change Neon configuration.
 *
 * The production branch ID mirrors `APPROVED_NEON_BRANCH_ID` from
 * `neon-contract.ts`. It remains local so `validate:neon-env` can load this
 * module without nested ESM resolution.
 */

/** Must equal `APPROVED_NEON_BRANCH_ID`; enforced by package tests. */
export const RECOVERY_PROD_BRANCH_ID = "br-tiny-hill-ao82jp6f" as const;

/** Launch-plan PITR history window: 7 days. */
export const TARGET_HISTORY_RETENTION_SECONDS = 604_800 as const;

/** Daily scheduled snapshot target hour in UTC. */
export const TARGET_SNAPSHOT_HOUR_UTC = 17 as const;

/** Scheduled snapshot retention target in days. */
export const TARGET_SNAPSHOT_RETAIN_DAYS = 14 as const;

/** PITR recovery-point objective. */
export const TARGET_RPO_PITR_SECONDS = 60 as const;

/** Scheduled snapshot fallback recovery-point objective. */
export const TARGET_RPO_SNAPSHOT_HOURS = 24 as const;

/** Ephemeral recovery-drill recovery-time objective. */
export const TARGET_RTO_DRILL_MINUTES = 30 as const;

/** Daily schedule plus operational tolerance. */
export const MAX_SCHEDULED_SNAPSHOT_AGE_HOURS = 26 as const;

/** Small allowance for clock skew between caller and Neon API timestamps. */
export const MAX_FUTURE_TIMESTAMP_SKEW_MINUTES = 5 as const;

/** Allowed timing drift around the configured scheduled snapshot hour. */
export const MAX_SNAPSHOT_SCHEDULE_DRIFT_MINUTES = 15 as const;

/** Maximum difference between snapshot name time and API created_at. */
export const MAX_SNAPSHOT_NAME_CREATED_AT_DRIFT_SECONDS = 60 as const;

const SCHEDULED_SNAPSHOT_NAME_PATTERN =
	/^snapshot_(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)$/;

const UTC_TIMESTAMP_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/;

export type NeonRecoveryIssue = Readonly<{
	check: string;
	message: string;
}>;

export type NeonRecoveryCheckResult = Readonly<{
	ok: boolean;
	issues: readonly NeonRecoveryIssue[];
	detail: string;
}>;

export type NeonProjectRecoveryInput = Readonly<{
	history_retention_seconds?: number | null;
}>;

export type NeonBranchRecoveryInput = Readonly<{
	id?: string | null;
	protected?: boolean | null;
	default?: boolean | null;
	primary?: boolean | null;
	name?: string | null;
}>;

export type NeonSnapshotRecoveryInput = Readonly<{
	id?: string | null;
	name?: string | null;
	created_at?: string | null;
	expires_at?: string | null;
	source_branch_id?: string | null;
	branch_id?: string | null;
}>;

export function formatNeonRecoveryIssues(
	issues: readonly NeonRecoveryIssue[],
): string {
	return issues.map((issue) => `${issue.check}: ${issue.message}`).join("; ");
}

function isFinitePositiveNumber(
	value: number | null | undefined,
): value is number {
	return (
		value !== null && value !== undefined && Number.isFinite(value) && value > 0
	);
}

function parseTimestamp(value: string | null | undefined): number | null {
	if (value === null || value === undefined || value.trim() === "") {
		return null;
	}
	const match = UTC_TIMESTAMP_PATTERN.exec(value);
	if (match === null) {
		return null;
	}
	const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw] = match;
	if (
		yearRaw === undefined ||
		monthRaw === undefined ||
		dayRaw === undefined ||
		hourRaw === undefined ||
		minuteRaw === undefined ||
		secondRaw === undefined
	) {
		return null;
	}
	const year = Number(yearRaw);
	const month = Number(monthRaw);
	const day = Number(dayRaw);
	const hour = Number(hourRaw);
	const minute = Number(minuteRaw);
	const second = Number(secondRaw);
	if (
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hour > 23 ||
		minute > 59 ||
		second > 59
	) {
		return null;
	}
	const parsed = Date.parse(value);
	if (Number.isNaN(parsed)) {
		return null;
	}
	const date = new Date(parsed);
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() + 1 !== month ||
		date.getUTCDate() !== day ||
		date.getUTCHours() !== hour ||
		date.getUTCMinutes() !== minute ||
		date.getUTCSeconds() !== second
	) {
		return null;
	}
	return parsed;
}

export function evaluateHistoryRetention(
	project: NeonProjectRecoveryInput,
): NeonRecoveryCheckResult {
	const actual = project.history_retention_seconds;
	if (actual === TARGET_HISTORY_RETENTION_SECONDS) {
		return {
			ok: true,
			issues: [],
			detail: `history_retention_seconds=${actual} target_seconds=604800`,
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
		detail: "history retention does not match target",
	};
}

export function evaluateProtectedProductionBranch(
	branch: NeonBranchRecoveryInput,
	expectedBranchId: string = RECOVERY_PROD_BRANCH_ID,
): NeonRecoveryCheckResult {
	const issues: NeonRecoveryIssue[] = [];

	if (expectedBranchId.trim().length === 0) {
		issues.push({
			check: "expected_branch_id",
			message: "expected branch ID must not be empty",
		});
	}
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
	if (
		branch.primary !== undefined &&
		branch.primary !== null &&
		branch.primary !== true
	) {
		issues.push({
			check: "branch.primary",
			message: `expected true when supplied, got ${String(branch.primary)}`,
		});
	}

	return {
		ok: issues.length === 0,
		issues,
		detail:
			`branch_match=${String(branch.id === expectedBranchId)} ` +
			`protected=${String(branch.protected)} ` +
			`default=${String(branch.default)} ` +
			`primary=${String(branch.primary ?? "unknown")}`,
	};
}

export function isScheduledSnapshotName(
	name: string | null | undefined,
): boolean {
	return scheduledSnapshotNameTimestamp(name) !== null;
}

export function scheduledSnapshotNameTimestamp(
	name: string | null | undefined,
): number | null {
	if (name === null || name === undefined) {
		return null;
	}
	const match = SCHEDULED_SNAPSHOT_NAME_PATTERN.exec(name);
	if (match === null) {
		return null;
	}
	const timestamp = match[1];
	if (timestamp === undefined) {
		return null;
	}
	return parseTimestamp(timestamp);
}

export function snapshotSourceBranchId(
	snapshot: NeonSnapshotRecoveryInput,
): string | null {
	return snapshot.source_branch_id ?? snapshot.branch_id ?? null;
}

export function scheduledSnapshotRetainDays(
	snapshot: NeonSnapshotRecoveryInput,
): number | null {
	const created = parseTimestamp(snapshot.created_at);
	const expires = parseTimestamp(snapshot.expires_at);
	if (created === null || expires === null || expires <= created) {
		return null;
	}
	return (expires - created) / (24 * 60 * 60 * 1_000);
}

export function scheduledSnapshotMinuteOfDayUtc(
	snapshot: NeonSnapshotRecoveryInput,
): number | null {
	const created = parseTimestamp(snapshot.created_at);
	if (created === null) {
		return null;
	}
	const date = new Date(created);
	return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function scheduledSnapshotHourUtc(
	snapshot: NeonSnapshotRecoveryInput,
): number | null {
	const minuteOfDay = scheduledSnapshotMinuteOfDayUtc(snapshot);
	return minuteOfDay === null ? null : Math.floor(minuteOfDay / 60);
}

function circularMinuteDifference(
	actualMinute: number,
	expectedMinute: number,
): number {
	const minutesPerDay = 24 * 60;
	const direct = Math.abs(actualMinute - expectedMinute);
	return Math.min(direct, minutesPerDay - direct);
}

export function evaluateScheduledSnapshotInventory(
	snapshots: readonly NeonSnapshotRecoveryInput[],
	options: Readonly<{
		nowMs?: number;
		expectedBranchId?: string;
		maxAgeHours?: number;
		scheduleDriftMinutes?: number;
		maxFutureSkewMinutes?: number;
	}> = {},
): NeonRecoveryCheckResult {
	const nowMs = options.nowMs ?? Date.now();
	const expectedBranchId = options.expectedBranchId ?? RECOVERY_PROD_BRANCH_ID;
	const maxAgeHours = options.maxAgeHours ?? MAX_SCHEDULED_SNAPSHOT_AGE_HOURS;
	const scheduleDriftMinutes =
		options.scheduleDriftMinutes ?? MAX_SNAPSHOT_SCHEDULE_DRIFT_MINUTES;
	const maxFutureSkewMinutes =
		options.maxFutureSkewMinutes ?? MAX_FUTURE_TIMESTAMP_SKEW_MINUTES;

	if (!Number.isFinite(nowMs) || nowMs < 0) {
		return {
			ok: false,
			issues: [
				{
					check: "snapshots.now_ms",
					message: "current timestamp must be finite and non-negative",
				},
			],
			detail: "snapshot evaluation clock invalid",
		};
	}
	if (expectedBranchId.trim().length === 0) {
		return {
			ok: false,
			issues: [
				{
					check: "expected_branch_id",
					message: "expected branch ID must not be empty",
				},
			],
			detail: "snapshot branch target invalid",
		};
	}
	if (!isFinitePositiveNumber(maxAgeHours)) {
		return {
			ok: false,
			issues: [
				{
					check: "snapshots.max_age_hours",
					message:
						"maximum snapshot age must be a finite number greater than zero",
				},
			],
			detail: "snapshot age threshold invalid",
		};
	}
	if (
		!Number.isFinite(scheduleDriftMinutes) ||
		scheduleDriftMinutes < 0 ||
		scheduleDriftMinutes >= 24 * 60
	) {
		return {
			ok: false,
			issues: [
				{
					check: "snapshots.schedule_drift_minutes",
					message: "schedule drift must be between 0 and 1439 minutes",
				},
			],
			detail: "snapshot schedule tolerance invalid",
		};
	}
	if (!Number.isFinite(maxFutureSkewMinutes) || maxFutureSkewMinutes < 0) {
		return {
			ok: false,
			issues: [
				{
					check: "snapshots.future_skew_minutes",
					message: "future timestamp skew must be finite and non-negative",
				},
			],
			detail: "snapshot future-skew tolerance invalid",
		};
	}

	const scheduled = snapshots
		.filter((snapshot) => isScheduledSnapshotName(snapshot.name))
		.filter((snapshot) => snapshotSourceBranchId(snapshot) === expectedBranchId)
		.map((snapshot) => ({
			snapshot,
			createdMs: parseTimestamp(snapshot.created_at),
		}))
		.filter(
			(
				entry,
			): entry is Readonly<{
				snapshot: NeonSnapshotRecoveryInput;
				createdMs: number;
			}> => entry.createdMs !== null,
		)
		.sort((left, right) => right.createdMs - left.createdMs);

	if (scheduled.length === 0) {
		return {
			ok: false,
			issues: [
				{
					check: "snapshots.scheduled",
					message:
						"no valid scheduled snapshot inventory exists for the production branch; Console verification is required",
				},
			],
			detail: "no valid scheduled snapshots found in inventory",
		};
	}

	const latestEntry = scheduled[0];
	if (latestEntry === undefined) {
		return {
			ok: false,
			issues: [
				{
					check: "snapshots.scheduled",
					message: "scheduled snapshot selection produced no result",
				},
			],
			detail: "scheduled snapshot selection unavailable",
		};
	}

	const { snapshot: latest, createdMs } = latestEntry;
	const issues: NeonRecoveryIssue[] = [];
	const expectedMinuteOfDay = TARGET_SNAPSHOT_HOUR_UTC * 60;
	const actualMinuteOfDay = scheduledSnapshotMinuteOfDayUtc(latest);
	const nameTimestampMs = scheduledSnapshotNameTimestamp(latest.name);

	if (actualMinuteOfDay === null) {
		issues.push({
			check: "snapshots.created_at",
			message: "latest scheduled snapshot has an invalid created_at timestamp",
		});
	} else {
		const minuteDifference = circularMinuteDifference(
			actualMinuteOfDay,
			expectedMinuteOfDay,
		);
		if (minuteDifference > scheduleDriftMinutes) {
			issues.push({
				check: "snapshots.schedule_time_utc",
				message:
					`latest scheduled snapshot differs from ${TARGET_SNAPSHOT_HOUR_UTC}:00 UTC by ` +
					`${minuteDifference} minutes, exceeding the ${scheduleDriftMinutes}-minute tolerance`,
			});
		}
	}
	if (nameTimestampMs === null) {
		issues.push({
			check: "snapshots.name_timestamp",
			message:
				"latest scheduled snapshot name does not contain a valid UTC timestamp",
		});
	} else {
		const nameCreatedAtDifferenceSeconds =
			Math.abs(nameTimestampMs - createdMs) / 1_000;
		if (
			nameCreatedAtDifferenceSeconds >
			MAX_SNAPSHOT_NAME_CREATED_AT_DRIFT_SECONDS
		) {
			issues.push({
				check: "snapshots.name_created_at_consistency",
				message:
					"latest scheduled snapshot name timestamp does not correspond to created_at",
			});
		}
	}

	const retainDays = scheduledSnapshotRetainDays(latest);
	if (
		retainDays === null ||
		Math.abs(retainDays - TARGET_SNAPSHOT_RETAIN_DAYS) > 1 / 24
	) {
		issues.push({
			check: "snapshots.retain_days",
			message:
				`latest scheduled snapshot retention must be ${TARGET_SNAPSHOT_RETAIN_DAYS} days ` +
				"within a one-hour tolerance",
		});
	}

	const ageHours = (nowMs - createdMs) / (60 * 60 * 1_000);
	const maxFutureSkewHours = maxFutureSkewMinutes / 60;
	if (ageHours < -maxFutureSkewHours) {
		issues.push({
			check: "snapshots.future_timestamp",
			message: `latest scheduled snapshot is ${Math.abs(ageHours).toFixed(1)} hours in the future`,
		});
	} else if (ageHours > maxAgeHours) {
		issues.push({
			check: "snapshots.freshness",
			message: `latest scheduled snapshot age ${ageHours.toFixed(1)}h exceeds ${maxAgeHours}h`,
		});
	}

	const detail =
		`inventory_inference=true ` +
		`scheduled_count=${scheduled.length} ` +
		`age_hours=${ageHours.toFixed(1)} ` +
		`retention_days=${retainDays === null ? "unknown" : retainDays.toFixed(2)}`;

	return {
		ok: issues.length === 0,
		issues,
		detail,
	};
}
