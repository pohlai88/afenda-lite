import { ok, type Result } from "@afenda/errors/result";

import {
	lifecycleInvalidExpectedVersion,
	lifecycleVersionConflict,
} from "./lifecycle-errors";
import type {
	LifecycleTransitionContext,
	VersionedLifecycleRecord,
} from "./types";

export function assertLifecycleExpectedVersion(
	current: VersionedLifecycleRecord,
	expectedVersion: number,
	context: Partial<
		Omit<LifecycleTransitionContext, "entityId" | "actualVersion">
	> = {},
): Result<true> {
	const entityType = context.entityType ?? "master_data";
	if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
		return lifecycleInvalidExpectedVersion({
			...context,
			entityType,
			entityId: current.id,
			expectedVersion,
		});
	}
	if (current.version !== expectedVersion) {
		return lifecycleVersionConflict({
			...context,
			entityType,
			entityId: current.id,
			expectedVersion,
			actualVersion: current.version,
		});
	}

	return ok(true);
}

export function nextLifecycleVersion(currentVersion: number): number {
	if (!Number.isSafeInteger(currentVersion) || currentVersion < 1) {
		throw new RangeError("currentVersion must be a positive safe integer");
	}
	if (currentVersion === Number.MAX_SAFE_INTEGER) {
		throw new RangeError(
			"currentVersion cannot be incremented beyond Number.MAX_SAFE_INTEGER",
		);
	}
	return currentVersion + 1;
}
