import type { Result } from "@afenda/errors";

import {
	assertLifecycleExpectedVersion,
	nextLifecycleVersion,
} from "../lifecycle-governance";

export type VersionedMaster = Readonly<{ id: string; version: number }>;

/**
 * Performs an early compare-and-swap check before mutation.
 * The production store remains authoritative and must CAS in its atomic write.
 */
export function assertExpectedVersion(
	current: VersionedMaster,
	expectedVersion: number,
): Result<true> {
	return assertLifecycleExpectedVersion(current, expectedVersion, {
		entityType: "core_master",
	});
}

/** A successful state mutation advances its aggregate version exactly once. */
export function nextMasterVersion(currentVersion: number): number {
	return nextLifecycleVersion(currentVersion);
}
