import { describe, expect, it } from "vitest";

import { APPROVED_NEON_BRANCH_ID } from "../src/neon-contract";
import {
	evaluateHistoryRetention,
	evaluateProtectedProductionBranch,
	evaluateScheduledSnapshotInventory,
	isScheduledSnapshotName,
	RECOVERY_PROD_BRANCH_ID,
	scheduledSnapshotHourUtc,
	scheduledSnapshotRetainDays,
	TARGET_HISTORY_RETENTION_SECONDS,
	TARGET_RPO_PITR_SECONDS,
	TARGET_RPO_SNAPSHOT_HOURS,
	TARGET_RTO_DRILL_MINUTES,
	TARGET_SNAPSHOT_HOUR_UTC,
	TARGET_SNAPSHOT_RETAIN_DAYS,
} from "../src/neon-recovery-posture";

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
	});

	it("passes history retention when API returns 7d", () => {
		expect(
			evaluateHistoryRetention({
				history_retention_seconds: TARGET_HISTORY_RETENTION_SECONDS,
			}).ok,
		).toBe(true);
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
				protected: false,
				default: true,
			}).ok,
		).toBe(false);
	});

	it("classifies scheduled snapshot names and retain window", () => {
		expect(isScheduledSnapshotName("snapshot_2026-07-16T17:00:05Z")).toBe(true);
		expect(isScheduledSnapshotName("baseline-manual")).toBe(false);
		const snap = {
			name: "snapshot_2026-07-16T17:00:05Z",
			created_at: "2026-07-16T17:00:05Z",
			expires_at: "2026-07-30T17:00:05Z",
		};
		expect(scheduledSnapshotHourUtc(snap)).toBe(17);
		expect(scheduledSnapshotRetainDays(snap)).toBe(14);
	});

	it("infers schedule health from snapshot inventory without schedule API", () => {
		const nowMs = Date.parse("2026-07-17T00:30:00Z");
		const result = evaluateScheduledSnapshotInventory(
			[
				{
					id: "snap-latest",
					name: "snapshot_2026-07-16T17:00:05Z",
					created_at: "2026-07-16T17:00:05Z",
					expires_at: "2026-07-30T17:00:05Z",
					source_branch_id: RECOVERY_PROD_BRANCH_ID,
				},
				{
					id: "snap-manual",
					name: "baseline-manual",
					created_at: "2026-07-12T08:44:55Z",
					source_branch_id: RECOVERY_PROD_BRANCH_ID,
				},
			],
			{ nowMs },
		);
		expect(result.ok).toBe(true);
		expect(result.detail).toContain("inventory inference");
	});

	it("fails when latest scheduled snapshot is stale", () => {
		const nowMs = Date.parse("2026-07-18T20:00:00Z");
		const result = evaluateScheduledSnapshotInventory(
			[
				{
					id: "snap-stale",
					name: "snapshot_2026-07-16T17:00:05Z",
					created_at: "2026-07-16T17:00:05Z",
					expires_at: "2026-07-30T17:00:05Z",
					source_branch_id: RECOVERY_PROD_BRANCH_ID,
				},
			],
			{ nowMs },
		);
		expect(result.ok).toBe(false);
		expect(
			result.issues.some((issue) => issue.check === "snapshots.freshness"),
		).toBe(true);
	});
});
