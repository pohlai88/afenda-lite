import { describe, expect, it } from "vitest";

import { APPROVED_NEON_BRANCH_ID } from "../src/neon-contract";
import {
	evaluateHistoryRetention,
	evaluateProtectedProductionBranch,
	evaluateScheduledSnapshotInventory,
	isScheduledSnapshotName,
	MAX_FUTURE_TIMESTAMP_SKEW_MINUTES,
	MAX_SNAPSHOT_NAME_CREATED_AT_DRIFT_SECONDS,
	MAX_SNAPSHOT_SCHEDULE_DRIFT_MINUTES,
	RECOVERY_PROD_BRANCH_ID,
	scheduledSnapshotHourUtc,
	scheduledSnapshotMinuteOfDayUtc,
	scheduledSnapshotNameTimestamp,
	scheduledSnapshotRetainDays,
	snapshotSourceBranchId,
	TARGET_HISTORY_RETENTION_SECONDS,
	TARGET_RPO_PITR_SECONDS,
	TARGET_RPO_SNAPSHOT_HOURS,
	TARGET_RTO_DRILL_MINUTES,
	TARGET_SNAPSHOT_HOUR_UTC,
	TARGET_SNAPSHOT_RETAIN_DAYS,
} from "../src/neon-recovery-posture";

const VALID_SNAPSHOT = {
	id: "snap-latest",
	name: "snapshot_2026-07-16T17:00:05Z",
	created_at: "2026-07-16T17:00:05Z",
	expires_at: "2026-07-30T17:00:05Z",
	source_branch_id: RECOVERY_PROD_BRANCH_ID,
} as const;

describe("@afenda/env neon-recovery-posture", () => {
	it("keeps recovery branch id aligned with N1 contract", () => {
		expect(RECOVERY_PROD_BRANCH_ID).toBe(APPROVED_NEON_BRANCH_ID);
	});

	it("exports Living RPO/RTO and retention targets", () => {
		expect(TARGET_HISTORY_RETENTION_SECONDS).toBe(604_800);
		expect(TARGET_SNAPSHOT_HOUR_UTC).toBe(17);
		expect(TARGET_SNAPSHOT_RETAIN_DAYS).toBe(14);
		expect(TARGET_RPO_PITR_SECONDS).toBe(60);
		expect(TARGET_RPO_SNAPSHOT_HOURS).toBe(24);
		expect(TARGET_RTO_DRILL_MINUTES).toBe(30);
		expect(MAX_FUTURE_TIMESTAMP_SKEW_MINUTES).toBe(5);
		expect(MAX_SNAPSHOT_SCHEDULE_DRIFT_MINUTES).toBe(15);
		expect(MAX_SNAPSHOT_NAME_CREATED_AT_DRIFT_SECONDS).toBe(60);
	});

	it("evaluates history retention exactly", () => {
		expect(
			evaluateHistoryRetention({
				history_retention_seconds: TARGET_HISTORY_RETENTION_SECONDS,
			}).ok,
		).toBe(true);
		expect(evaluateHistoryRetention({}).ok).toBe(false);
		expect(
			evaluateHistoryRetention({
				history_retention_seconds: TARGET_HISTORY_RETENTION_SECONDS + 1,
			}).ok,
		).toBe(false);
		expect(
			evaluateHistoryRetention({ history_retention_seconds: 86_400 }).ok,
		).toBe(false);
	});

	it("requires protected default production branch", () => {
		expect(
			evaluateProtectedProductionBranch({
				id: RECOVERY_PROD_BRANCH_ID,
				protected: true,
				default: true,
				primary: true,
				name: "production",
			}).ok,
		).toBe(true);
		expect(
			evaluateProtectedProductionBranch({
				id: RECOVERY_PROD_BRANCH_ID,
				protected: true,
				default: true,
			}).ok,
		).toBe(true);
		expect(
			evaluateProtectedProductionBranch({
				id: "br-wrong",
				protected: true,
				default: true,
			}).ok,
		).toBe(false);
		expect(
			evaluateProtectedProductionBranch({
				id: RECOVERY_PROD_BRANCH_ID,
				protected: false,
				default: true,
			}).ok,
		).toBe(false);
		expect(
			evaluateProtectedProductionBranch({
				id: RECOVERY_PROD_BRANCH_ID,
				protected: true,
				default: false,
			}).ok,
		).toBe(false);
		expect(
			evaluateProtectedProductionBranch({
				id: RECOVERY_PROD_BRANCH_ID,
				protected: true,
				default: true,
				primary: false,
			}).ok,
		).toBe(false);
		expect(
			evaluateProtectedProductionBranch(
				{ id: RECOVERY_PROD_BRANCH_ID, protected: true, default: true },
				"",
			).ok,
		).toBe(false);
	});

	it("classifies scheduled snapshot names strictly", () => {
		expect(isScheduledSnapshotName("snapshot_2026-07-16T17:00:05Z")).toBe(true);
		expect(isScheduledSnapshotName("snapshot_2026-07-16T17:00:05.123Z")).toBe(
			true,
		);
		expect(
			scheduledSnapshotNameTimestamp("snapshot_2026-07-16T17:00:05Z"),
		).toBe(Date.parse("2026-07-16T17:00:05Z"));
		expect(isScheduledSnapshotName("snapshot_manual")).toBe(false);
		expect(isScheduledSnapshotName("snapshot_2026-07-16")).toBe(false);
		expect(isScheduledSnapshotName("snapshot_2026-99-88T77:66:55Z")).toBe(
			false,
		);
		expect(isScheduledSnapshotName("snapshot_2026-02-30T17:00:05Z")).toBe(
			false,
		);
		expect(isScheduledSnapshotName("snapshot_2026-04-31T17:00:05Z")).toBe(
			false,
		);
		expect(isScheduledSnapshotName("snapshot_2026-07-16T24:00:00Z")).toBe(
			false,
		);
		expect(
			isScheduledSnapshotName("prefix_snapshot_2026-07-16T17:00:05Z"),
		).toBe(false);
		expect(isScheduledSnapshotName("snapshot_2026-07-16T17:00:05Z_extra")).toBe(
			false,
		);
		expect(isScheduledSnapshotName("baseline-manual")).toBe(false);
	});

	it("extracts source branch and precise snapshot timing", () => {
		expect(snapshotSourceBranchId(VALID_SNAPSHOT)).toBe(
			RECOVERY_PROD_BRANCH_ID,
		);
		expect(
			snapshotSourceBranchId({
				...VALID_SNAPSHOT,
				source_branch_id: undefined,
				branch_id: RECOVERY_PROD_BRANCH_ID,
			}),
		).toBe(RECOVERY_PROD_BRANCH_ID);
		expect(
			snapshotSourceBranchId({ ...VALID_SNAPSHOT, source_branch_id: null }),
		).toBeNull();
		expect(scheduledSnapshotHourUtc(VALID_SNAPSHOT)).toBe(17);
		expect(scheduledSnapshotMinuteOfDayUtc(VALID_SNAPSHOT)).toBe(17 * 60);
		expect(scheduledSnapshotRetainDays(VALID_SNAPSHOT)).toBe(14);
		expect(
			scheduledSnapshotRetainDays({
				...VALID_SNAPSHOT,
				expires_at: "2026-07-30T16:30:05Z",
			}),
		).toBeCloseTo(13.979_166_666_7);
		expect(
			scheduledSnapshotRetainDays({
				...VALID_SNAPSHOT,
				expires_at: "2026-07-16T16:00:05Z",
			}),
		).toBeNull();
	});

	it("infers schedule health from snapshot inventory without schedule API", () => {
		const snapshots = [
			{
				id: "snap-manual",
				name: "baseline-manual",
				created_at: "2026-07-12T08:44:55Z",
				source_branch_id: RECOVERY_PROD_BRANCH_ID,
			},
			VALID_SNAPSHOT,
		];
		const originalOrder = snapshots.map((snapshot) => snapshot.id);
		const result = evaluateScheduledSnapshotInventory(snapshots, {
			nowMs: Date.parse("2026-07-17T00:30:00Z"),
		});

		expect(result.ok).toBe(true);
		expect(result.detail).toContain("inventory_inference=true");
		expect(result.detail).toContain("scheduled_count=1");
		expect(result.detail).not.toContain("snap-latest");
		expect(result.detail).not.toContain("2026-07-16T17:00:05Z");
		expect(snapshots.map((snapshot) => snapshot.id)).toEqual(originalOrder);
	});

	it("selects the latest valid row and excludes invalid created_at rows", () => {
		const result = evaluateScheduledSnapshotInventory(
			[
				{
					...VALID_SNAPSHOT,
					id: "invalid-created",
					created_at: "not-a-date",
				},
				{
					...VALID_SNAPSHOT,
					id: "older-valid",
					created_at: "2026-07-15T17:00:05Z",
					expires_at: "2026-07-29T17:00:05Z",
				},
				VALID_SNAPSHOT,
			],
			{ nowMs: Date.parse("2026-07-17T00:30:00Z") },
		);

		expect(result.ok).toBe(true);
		expect(result.detail).toContain("scheduled_count=2");
	});

	it("fails stale, future, drifted, and imprecise-retention snapshots", () => {
		expect(
			evaluateScheduledSnapshotInventory([VALID_SNAPSHOT], {
				nowMs: Date.parse("2026-07-18T20:00:00Z"),
			}).issues.some((issue) => issue.check === "snapshots.freshness"),
		).toBe(true);
		expect(
			evaluateScheduledSnapshotInventory([VALID_SNAPSHOT], {
				nowMs: Date.parse("2026-07-16T16:57:00Z"),
			}).ok,
		).toBe(true);
		expect(
			evaluateScheduledSnapshotInventory([VALID_SNAPSHOT], {
				nowMs: Date.parse("2026-07-16T14:00:00Z"),
			}).issues.some((issue) => issue.check === "snapshots.future_timestamp"),
		).toBe(true);
		expect(
			evaluateScheduledSnapshotInventory(
				[
					{
						...VALID_SNAPSHOT,
						name: "snapshot_2026-07-16T17:59:05Z",
						created_at: "2026-07-16T17:59:05Z",
						expires_at: "2026-07-30T17:59:05Z",
					},
				],
				{ nowMs: Date.parse("2026-07-17T00:30:00Z") },
			).issues.some((issue) => issue.check === "snapshots.schedule_time_utc"),
		).toBe(true);
		expect(
			evaluateScheduledSnapshotInventory(
				[
					{
						...VALID_SNAPSHOT,
						expires_at: "2026-07-30T15:30:05Z",
					},
				],
				{ nowMs: Date.parse("2026-07-17T00:30:00Z") },
			).issues.some((issue) => issue.check === "snapshots.retain_days"),
		).toBe(true);
	});

	it("requires snapshot name timestamp to correspond to created_at", () => {
		expect(
			evaluateScheduledSnapshotInventory(
				[
					{
						...VALID_SNAPSHOT,
						name: "snapshot_2026-07-16T17:00:05Z",
						created_at: "2026-07-16T17:01:05Z",
						expires_at: "2026-07-30T17:01:05Z",
					},
				],
				{ nowMs: Date.parse("2026-07-17T00:30:00Z") },
			).ok,
		).toBe(true);
		const mismatched = evaluateScheduledSnapshotInventory(
			[
				{
					...VALID_SNAPSHOT,
					name: "snapshot_2026-07-16T17:00:05Z",
					created_at: "2026-07-16T17:01:06Z",
					expires_at: "2026-07-30T17:01:06Z",
				},
			],
			{ nowMs: Date.parse("2026-07-17T00:30:00Z") },
		);
		expect(mismatched.ok).toBe(false);
		expect(
			mismatched.issues.some(
				(issue) => issue.check === "snapshots.name_created_at_consistency",
			),
		).toBe(true);
	});

	it("requires scheduled snapshots to identify the production branch", () => {
		const nowMs = Date.parse("2026-07-17T00:30:00Z");
		expect(
			evaluateScheduledSnapshotInventory(
				[
					{
						...VALID_SNAPSHOT,
						source_branch_id: undefined,
						branch_id: RECOVERY_PROD_BRANCH_ID,
					},
				],
				{ nowMs },
			).ok,
		).toBe(true);

		const branchless = evaluateScheduledSnapshotInventory(
			[{ ...VALID_SNAPSHOT, source_branch_id: undefined }],
			{ nowMs },
		);
		expect(branchless.ok).toBe(false);
		expect(branchless.issues[0]?.check).toBe("snapshots.scheduled");

		const wrongBranch = evaluateScheduledSnapshotInventory(
			[{ ...VALID_SNAPSHOT, source_branch_id: "br-other" }],
			{ nowMs },
		);
		expect(wrongBranch.ok).toBe(false);
		expect(wrongBranch.issues[0]?.check).toBe("snapshots.scheduled");
	});

	it("rejects invalid inventory evaluator options", () => {
		expect(
			evaluateScheduledSnapshotInventory([VALID_SNAPSHOT], {
				nowMs: Number.NaN,
			}).issues[0]?.check,
		).toBe("snapshots.now_ms");
		expect(
			evaluateScheduledSnapshotInventory([VALID_SNAPSHOT], {
				expectedBranchId: "",
			}).issues[0]?.check,
		).toBe("expected_branch_id");
		expect(
			evaluateScheduledSnapshotInventory([VALID_SNAPSHOT], {
				maxAgeHours: 0,
			}).issues[0]?.check,
		).toBe("snapshots.max_age_hours");
		expect(
			evaluateScheduledSnapshotInventory([VALID_SNAPSHOT], {
				scheduleDriftMinutes: 24 * 60,
			}).issues[0]?.check,
		).toBe("snapshots.schedule_drift_minutes");
		expect(
			evaluateScheduledSnapshotInventory([VALID_SNAPSHOT], {
				maxFutureSkewMinutes: -1,
			}).issues[0]?.check,
		).toBe("snapshots.future_skew_minutes");
	});
});
