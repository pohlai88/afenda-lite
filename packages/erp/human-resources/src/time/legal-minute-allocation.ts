import type { AttendanceSession } from "../types";
import type { AttendanceBreakInterval } from "./attendance/session-resolution";
import { parseStoredBreakIntervals } from "./attendance/session-resolution";

export type { AttendanceBreakInterval } from "./attendance/session-resolution";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Civil yyyy-MM-dd for an instant in an IANA timezone. */
export function civilDateInTimeZone(instant: Date, timeZone: string): string {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	return formatter.format(instant);
}

function isWithinBreakInterval(
	instant: Date,
	intervals: readonly AttendanceBreakInterval[],
): boolean {
	const time = instant.getTime();
	for (const interval of intervals) {
		if (time >= interval.startedAt.getTime() && time < interval.endedAt.getTime()) {
			return true;
		}
	}
	return false;
}

/**
 * Split gross worked minutes across IANA civil dates using clock bounds and
 * actual break intervals. Minute iteration keeps DST boundaries correct.
 * Automatic policy deductions remain on the session aggregate.
 */
export function allocateWorkedMinutesByCivilDate(input: {
	firstClockInAt: Date;
	finalClockOutAt: Date;
	breakIntervals: readonly AttendanceBreakInterval[];
	timeZone: string;
}): ReadonlyMap<string, number> {
	const minutesByDate = new Map<string, number>();
	const rangeStart = input.firstClockInAt.getTime();
	const rangeEnd = input.finalClockOutAt.getTime();
	if (rangeEnd <= rangeStart) {
		return minutesByDate;
	}

	for (
		let cursor = rangeStart;
		cursor < rangeEnd;
		cursor += 60_000
	) {
		const instant = new Date(cursor);
		if (isWithinBreakInterval(instant, input.breakIntervals)) {
			continue;
		}
		const civilDate = civilDateInTimeZone(instant, input.timeZone);
		minutesByDate.set(civilDate, (minutesByDate.get(civilDate) ?? 0) + 1);
	}

	return minutesByDate;
}

export function sessionBreakIntervals(
	session: AttendanceSession,
): readonly AttendanceBreakInterval[] {
	return parseStoredBreakIntervals(session.provenance.breakIntervals);
}

export function workedMinutesForSessionCivilDate(
	session: AttendanceSession,
	workDate: string,
): number {
	if (
		session.resolutionStatus !== "resolved" ||
		session.firstClockInAt === null ||
		session.finalClockOutAt === null
	) {
		return 0;
	}
	const intervals = sessionBreakIntervals(session);
	if (intervals.length === 0) {
		return session.localWorkDate === workDate ? session.workedMinutes : 0;
	}
	const allocated = allocateWorkedMinutesByCivilDate({
		firstClockInAt: session.firstClockInAt,
		finalClockOutAt: session.finalClockOutAt,
		breakIntervals: intervals,
		timeZone: session.timezone,
	});
	const precise = allocated.get(workDate) ?? 0;
	if (precise > 0) {
		return precise;
	}
	return session.localWorkDate === workDate ? session.workedMinutes : 0;
}

export function attendanceEntrySourceReference(
	sessionId: string,
	workDate: string,
): string {
	return `${sessionId}:${workDate}`;
}

export function parseAttendanceEntrySourceReference(
	sourceReference: string,
): { sessionId: string; workDate: string } | null {
	const separator = sourceReference.lastIndexOf(":");
	if (separator <= 0) {
		return null;
	}
	const workDate = sourceReference.slice(separator + 1);
	if (!ISO_DATE.test(workDate)) {
		return null;
	}
	return {
		sessionId: sourceReference.slice(0, separator),
		workDate,
	};
}
