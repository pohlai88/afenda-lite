import type { MasterStatus } from "../../../types";

export const SEARCH_LIFECYCLE_PROJECTION_ACTIONS = [
	"exclude",
	"index_selectable",
	"index_administrative",
	"index_blocked",
	"historical_only",
	"remove",
	"canonicalize",
] as const;

export type SearchLifecycleProjectionAction =
	(typeof SEARCH_LIFECYCLE_PROJECTION_ACTIONS)[number];

export type SearchProjectableMasterStatus =
	| MasterStatus
	| "archived"
	| "merged";

export const PROJECTION_VERSION_DECISIONS = [
	"apply",
	"replay",
	"ignore_stale",
	"invalid_version",
] as const;

export type ProjectionVersionDecision =
	(typeof PROJECTION_VERSION_DECISIONS)[number];

export type ProjectionVersionInput = Readonly<{
	currentAggregateVersion: number | null;
	incomingAggregateVersion: number;
}>;

export function searchActionForMasterStatus(
	status: SearchProjectableMasterStatus,
): SearchLifecycleProjectionAction {
	switch (status) {
		case "draft":
			return "exclude";
		case "active":
			return "index_selectable";
		case "inactive":
			return "index_administrative";
		case "blocked":
			return "index_blocked";
		case "retired":
			return "historical_only";
		case "archived":
			return "remove";
		case "merged":
			return "canonicalize";
		default:
			return assertNever(status);
	}
}

export function shouldApplyProjection(input: ProjectionVersionInput): boolean {
	return decideProjectionVersion(input) === "apply";
}

export function decideProjectionVersion(
	input: ProjectionVersionInput,
): ProjectionVersionDecision {
	if (
		!isPositiveVersion(input.incomingAggregateVersion) ||
		(input.currentAggregateVersion !== null &&
			!isPositiveVersion(input.currentAggregateVersion))
	) {
		return "invalid_version";
	}
	if (input.currentAggregateVersion === null) {
		return "apply";
	}
	if (input.incomingAggregateVersion > input.currentAggregateVersion) {
		return "apply";
	}
	if (input.incomingAggregateVersion === input.currentAggregateVersion) {
		return "replay";
	}
	return "ignore_stale";
}

function isPositiveVersion(value: number): boolean {
	return Number.isSafeInteger(value) && value >= 1;
}

function assertNever(value: never): never {
	throw new Error(`Unsupported master search status: ${String(value)}`);
}
