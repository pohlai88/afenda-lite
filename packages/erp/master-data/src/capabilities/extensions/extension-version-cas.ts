import type { Result } from "@afenda/errors";

import {
	assertLifecycleExpectedVersion,
	nextLifecycleVersion,
} from "../lifecycle-governance";
import type { ExtensionKind } from "./extension-policies";

export type VersionedExtension = Readonly<{
	id: string;
	version: number;
}>;

/**
 * Performs the command-layer CAS preflight check for an extension mutation.
 *
 * This check improves failure quality but does not provide concurrency safety
 * by itself. The production mutation must still include organization, entity
 * ID, and expected version in the same atomic mutation predicate.
 */
export function assertExpectedExtensionVersion(
	current: VersionedExtension,
	expectedVersion: number,
	entityType: ExtensionKind,
): Result<true> {
	return assertLifecycleExpectedVersion(current, expectedVersion, {
		entityType,
	});
}

/** Advances an extension version exactly once after a successful mutation. */
export function nextExtensionVersion(currentVersion: number): number {
	return nextLifecycleVersion(currentVersion);
}
