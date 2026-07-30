import { fail, ok, type Result } from "@afenda/errors/result";

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

export async function resolveTenantScopedCasMiss(input: {
	entityType: string;
	entityId: string;
	expectedVersion: number;
	loadCurrent: () => Promise<Result<VersionedLifecycleRecord | null>>;
	notFoundMessage: string;
	unchangedMissMessage: string;
}): Promise<Result<never>> {
	const current = await input.loadCurrent();
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail("NOT_FOUND", input.notFoundMessage, {
			reason: "MASTER_NOT_FOUND",
			entityType: input.entityType,
			entityId: input.entityId,
		});
	}
	if (current.data.version !== input.expectedVersion) {
		return lifecycleVersionConflict({
			entityType: input.entityType,
			entityId: input.entityId,
			expectedVersion: input.expectedVersion,
			actualVersion: current.data.version,
		});
	}
	return fail("CONFLICT", input.unchangedMissMessage, {
		reason: "MASTER_INVALID_STATE",
		entityType: input.entityType,
		entityId: input.entityId,
		expectedVersion: input.expectedVersion,
	});
}
