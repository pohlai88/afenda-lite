import type { AttendanceEvent } from "../../types";

/**
 * Canonical ascending order for attendance events feeding session resolution
 * and exception detection: occurredAt → sourceSequence → id (HR-ENT-16 / HR-OPS-P2-003).
 */
export function compareAttendanceEventsForSession(
	left: Pick<AttendanceEvent, "occurredAt" | "sourceSequence" | "id">,
	right: Pick<AttendanceEvent, "occurredAt" | "sourceSequence" | "id">,
): number {
	const byOccurredAt = left.occurredAt.getTime() - right.occurredAt.getTime();
	if (byOccurredAt !== 0) {
		return byOccurredAt;
	}
	const bySourceSequence = left.sourceSequence - right.sourceSequence;
	if (bySourceSequence !== 0) {
		return bySourceSequence;
	}
	return left.id.localeCompare(right.id);
}

export function sortAttendanceEventsForSession<
	T extends Pick<AttendanceEvent, "occurredAt" | "sourceSequence" | "id">,
>(events: readonly T[]): T[] {
	return [...events].sort(compareAttendanceEventsForSession);
}

/** Filter one employee work day, then apply the canonical session sort. */
export function filterAttendanceEventsForWorkDay(
	events: Iterable<AttendanceEvent>,
	scope: {
		organizationId: string;
		employeeId: AttendanceEvent["employeeId"];
		localWorkDate: string;
	},
): AttendanceEvent[] {
	return sortAttendanceEventsForSession(
		[...events].filter(
			(event) =>
				event.organizationId === scope.organizationId &&
				event.employeeId === scope.employeeId &&
				event.localWorkDate === scope.localWorkDate,
		),
	);
}

/** Import batch row: explicit sequence wins; otherwise 0-based row index (replay-stable). */
export function resolveImportRowSourceSequence(
	row: { sourceSequence?: number | undefined },
	rowIndex: number,
): number {
	return row.sourceSequence ?? rowIndex;
}

export function resolveAttendanceEventSourceSequence(input: {
	explicit?: number | undefined;
	existingEvents: readonly Pick<AttendanceEvent, "sourceSequence">[];
}): number {
	if (input.explicit !== undefined) {
		return input.explicit;
	}
	let maxSequence = -1;
	for (const event of input.existingEvents) {
		if (event.sourceSequence > maxSequence) {
			maxSequence = event.sourceSequence;
		}
	}
	return maxSequence + 1;
}
