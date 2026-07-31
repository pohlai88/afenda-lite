import { errorResult, type Result } from "@afenda/errors";

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

	return errorResult.ok(true);
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
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
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}
