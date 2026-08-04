/**
 * Ordering revision for accepted handoff supersession (closure C2).
 *
 * `contractVersion` on the wire is the schema literal (`hr.payroll-handoff.v1`),
 * not a monotonic employment revision. Ordering uses `sourceVersion` axes that
 * HR stamps from living compensation / leave / timesheet versions.
 */

export type HandoffSourceRevision = Readonly<{
	compensationVersion: number;
	leavePolicyVersion: number;
	timesheetVersion: number;
}>;

const EMPTY_REVISION: HandoffSourceRevision = {
	compensationVersion: 0,
	leavePolicyVersion: 0,
	timesheetVersion: 0,
};

function positiveIntOrZero(value: unknown): number {
	return typeof value === "number" && Number.isInteger(value) && value > 0
		? value
		: 0;
}

export function extractHandoffSourceRevision(
	payload: unknown,
): HandoffSourceRevision {
	if (
		payload === null ||
		typeof payload !== "object" ||
		Array.isArray(payload)
	) {
		return EMPTY_REVISION;
	}
	const { sourceVersion } = payload as { sourceVersion?: unknown };
	if (
		sourceVersion === null ||
		typeof sourceVersion !== "object" ||
		Array.isArray(sourceVersion)
	) {
		return EMPTY_REVISION;
	}
	const { compensationVersion, leavePolicyVersion, timesheetVersion } =
		sourceVersion as Record<string, unknown>;
	return {
		compensationVersion: positiveIntOrZero(compensationVersion),
		leavePolicyVersion: positiveIntOrZero(leavePolicyVersion),
		timesheetVersion: positiveIntOrZero(timesheetVersion),
	};
}

/**
 * Incoming is newer only when every axis is ≥ active and at least one axis is
 * strictly greater. Incomparable or equal revisions cannot supersede.
 */
export function isStrictlyNewerHandoffRevision(
	incoming: HandoffSourceRevision,
	active: HandoffSourceRevision,
): boolean {
	const deltas = [
		incoming.compensationVersion - active.compensationVersion,
		incoming.leavePolicyVersion - active.leavePolicyVersion,
		incoming.timesheetVersion - active.timesheetVersion,
	] as const;
	if (deltas.some((delta) => delta < 0)) {
		return false;
	}
	return deltas.some((delta) => delta > 0);
}
