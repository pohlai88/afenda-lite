import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";

import type { AttendanceExceptionType } from "../../src/types";
import type { WorkforceStoreAdapter } from "./hr-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

export const runDrizzleParity =
	hasDatabase && process.env.REQUIRE_DATABASE_TESTS === "1";

export const STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
	dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
	isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
	standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
	standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
	standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
}));

export const ALL_ATTENDANCE_EXCEPTION_TYPES = [
	"late_arrival",
	"early_departure",
	"absence",
	"missing_clock_in",
	"missing_clock_out",
	"unplanned_attendance",
	"overlapping_attendance",
	"excessive_break",
	"insufficient_rest",
	"schedule_mismatch",
	"location_mismatch",
	"overtime_candidate",
] as const satisfies readonly AttendanceExceptionType[];

type MissingAttendanceExceptionType = Exclude<
	AttendanceExceptionType,
	(typeof ALL_ATTENDANCE_EXCEPTION_TYPES)[number]
>;

export const ATTENDANCE_EXCEPTION_INVENTORY_IS_EXHAUSTIVE: MissingAttendanceExceptionType extends never
	? true
	: never = true;

export const ATTENDANCE_EXCEPTION_SEVERITY = {
	late_arrival: "warning",
	early_departure: "warning",
	absence: "warning",
	missing_clock_in: "critical",
	missing_clock_out: "warning",
	unplanned_attendance: "info",
	overlapping_attendance: "critical",
	excessive_break: "warning",
	insufficient_rest: "critical",
	schedule_mismatch: "warning",
	location_mismatch: "warning",
	overtime_candidate: "info",
} as const satisfies Record<
	AttendanceExceptionType,
	"info" | "warning" | "critical"
>;

export function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
