import { z } from "zod";

import {
	humanResourcesAttendanceEventIdSchema,
	humanResourcesAttendanceExceptionIdSchema,
	humanResourcesAttendanceSessionIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentCalendarAssignmentIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesOvertimeRequestIdSchema,
	humanResourcesShiftAssignmentIdSchema,
	humanResourcesShiftBreakIdSchema,
	humanResourcesShiftIdSchema,
	humanResourcesTimeApprovalAuthorityAssignmentIdSchema,
	humanResourcesTimePolicyIdSchema,
	humanResourcesTimesheetEntryIdSchema,
	humanResourcesTimesheetIdSchema,
	humanResourcesWorkCalendarHolidayIdSchema,
	humanResourcesWorkCalendarIdSchema,
	humanResourcesWorkCalendarScopeAssignmentIdSchema,
} from "../brands";
import { isValidIanaTimeZone } from "../time/iana-timezone";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
	isoDateTimeSchema,
} from "./common";

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const workCalendarScopeTypeSchema = z.enum([
	"employment",
	"employee",
	"location",
	"department",
	"legal_entity",
	"organization",
]);
const timezoneSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.refine(isValidIanaTimeZone, "Must be a valid IANA timezone");
const unverifiedTimezoneSchema = z.string().trim().min(1).max(64);
const minutesSchema = z.number().int().nonnegative().max(1440);
const positiveMinutesSchema = z.number().int().positive().max(1440);
const timeApprovalAuthoritySchema = z.enum([
	"line_manager",
	"department",
	"hr",
	"payroll",
]);
const nullableReferenceSchema = z
	.string()
	.trim()
	.min(1)
	.max(200)
	.nullable()
	.optional();

const workWeekDayPatternSchema = z
	.object({
		dayOfWeek: z.union([
			z.literal(0),
			z.literal(1),
			z.literal(2),
			z.literal(3),
			z.literal(4),
			z.literal(5),
			z.literal(6),
		]),
		isWorkingDay: z.boolean(),
		standardStartTime: timeOfDaySchema.nullable(),
		standardEndTime: timeOfDaySchema.nullable(),
		standardMinutes: z.number().int().nonnegative().max(1440).nullable(),
	})
	.strict();

const shiftKindSchema = z.enum([
	"fixed",
	"flexible",
	"split",
	"rest_day",
	"public_holiday",
]);

const attendanceEventTypeSchema = z.enum([
	"clock_in",
	"clock_out",
	"break_start",
	"break_end",
	"manual_adjustment",
]);

const attendanceEventSourceSchema = z.enum([
	"self",
	"supervisor",
	"import",
	"system",
	"manual",
]);

const exceptionTypeSchema = z.enum([
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
]);

const timesheetEntrySourceTypeSchema = z.enum([
	"attendance",
	"schedule",
	"manual",
	"leave",
	"external",
]);

const timesheetEntryTimeTypeSchema = z.enum([
	"regular",
	"overtime",
	"rest_day",
	"public_holiday",
	"night",
	"call_back",
	"training",
	"travel",
	"standby",
	"unpaid",
]);

const overtimeTypeSchema = z.enum([
	"weekday_overtime",
	"rest_day_overtime",
	"public_holiday_overtime",
	"night_overtime",
	"call_back",
	"emergency_overtime",
]);

const timesheetStatusSchema = z.enum([
	"draft",
	"submitted",
	"returned",
	"approved",
	"rejected",
	"locked",
	"superseded",
]);

// Work calendar
export const createWorkCalendarInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(200),
		timezone: timezoneSchema,
		calendarVersion: z.string().trim().min(1).max(64),
		workWeek: z.array(workWeekDayPatternSchema).length(7),
		standardHoursPerDay: z.string().regex(/^\d+(\.\d{1,2})?$/),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: humanResourcesIdempotencyKeySchema,
	})
	.strict();

export const updateWorkCalendarInputSchema = humanResourcesMutationContextSchema
	.extend({
		calendarId: humanResourcesWorkCalendarIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		timezone: timezoneSchema.optional(),
		calendarVersion: z.string().trim().min(1).max(64).optional(),
		workWeek: z.array(workWeekDayPatternSchema).length(7).optional(),
		standardHoursPerDay: z
			.string()
			.regex(/^\d+(\.\d{1,2})?$/)
			.optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const supersedeWorkCalendarInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			calendarId: humanResourcesWorkCalendarIdSchema,
			name: z.string().trim().min(1).max(200).optional(),
			timezone: timezoneSchema.optional(),
			calendarVersion: z.string().trim().min(1).max(64),
			workWeek: z.array(workWeekDayPatternSchema).length(7).optional(),
			standardHoursPerDay: z
				.string()
				.regex(/^\d+(\.\d{1,2})?$/)
				.optional(),
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const archiveWorkCalendarInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			calendarId: humanResourcesWorkCalendarIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getWorkCalendarInputSchema = humanResourcesMutationContextSchema
	.extend({
		calendarId: humanResourcesWorkCalendarIdSchema,
	})
	.strict();

export const listWorkCalendarsInputSchema = humanResourcesMutationContextSchema
	.extend({
		status: z.enum(["active", "superseded", "archived"]).optional(),
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
	})
	.strict();

export const workCalendarDateOverrideKindSchema = z.enum([
	"holiday",
	"half_day",
	"shortened_day",
	"replacement_workday",
	"closure",
]);

function applyWorkCalendarOverrideDefaults<
	T extends {
		overrideKind?: z.infer<typeof workCalendarDateOverrideKindSchema>;
		isWorkingDay?: boolean;
		expectedMinutes?: number | null;
	},
>(
	data: T,
): T & {
	overrideKind: z.infer<typeof workCalendarDateOverrideKindSchema>;
	isWorkingDay: boolean;
	expectedMinutes: number | null;
} {
	const overrideKind = data.overrideKind ?? "holiday";
	const isWorkingDay =
		data.isWorkingDay ??
		(overrideKind === "half_day" ||
			overrideKind === "shortened_day" ||
			overrideKind === "replacement_workday");
	return {
		...data,
		overrideKind,
		isWorkingDay,
		expectedMinutes: data.expectedMinutes ?? null,
	};
}

function assertWorkCalendarOverrideConsistency(data: {
	overrideKind: z.infer<typeof workCalendarDateOverrideKindSchema>;
	isWorkingDay: boolean;
	expectedMinutes: number | null;
}): boolean {
	const nonWorking =
		data.overrideKind === "holiday" || data.overrideKind === "closure";
	if (nonWorking && data.isWorkingDay) {
		return false;
	}
	if (!nonWorking && !data.isWorkingDay) {
		return false;
	}
	if (
		(data.overrideKind === "half_day" ||
			data.overrideKind === "shortened_day") &&
		data.expectedMinutes === null
	) {
		return false;
	}
	return true;
}

const workCalendarOverrideFieldsSchema = {
	overrideKind: workCalendarDateOverrideKindSchema.optional(),
	isWorkingDay: z.boolean().optional(),
	expectedMinutes: positiveMinutesSchema.nullable().optional(),
};

export const addWorkCalendarHolidayInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			calendarId: humanResourcesWorkCalendarIdSchema,
			holidayDate: isoDateSchema,
			label: z.string().trim().min(1).max(200).nullable().optional(),
			locationCode: z.string().trim().min(1).max(64).nullable().optional(),
			jurisdiction: z.string().trim().min(1).max(64).nullable().optional(),
			...workCalendarOverrideFieldsSchema,
		})
		.strict()
		.transform(applyWorkCalendarOverrideDefaults)
		.refine(assertWorkCalendarOverrideConsistency, {
			message:
				"Override kind, isWorkingDay, and expectedMinutes are inconsistent",
		});

export const addCalendarDateOverrideInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			calendarId: humanResourcesWorkCalendarIdSchema,
			holidayDate: isoDateSchema,
			overrideKind: workCalendarDateOverrideKindSchema,
			isWorkingDay: z.boolean().optional(),
			expectedMinutes: positiveMinutesSchema.nullable().optional(),
			label: z.string().trim().min(1).max(200).nullable().optional(),
			locationCode: z.string().trim().min(1).max(64).nullable().optional(),
			jurisdiction: z.string().trim().min(1).max(64).nullable().optional(),
		})
		.strict()
		.transform(applyWorkCalendarOverrideDefaults)
		.refine(assertWorkCalendarOverrideConsistency, {
			message:
				"Override kind, isWorkingDay, and expectedMinutes are inconsistent",
		});

export const removeWorkCalendarHolidayInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			holidayId: humanResourcesWorkCalendarHolidayIdSchema,
		})
		.strict();

export const removeCalendarDateOverrideInputSchema =
	removeWorkCalendarHolidayInputSchema;

export const listWorkCalendarHolidaysInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			calendarId: humanResourcesWorkCalendarIdSchema,
			fromDate: isoDateSchema.optional(),
			toDate: isoDateSchema.optional(),
		})
		.strict();

export const assignEmploymentCalendarInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			calendarId: humanResourcesWorkCalendarIdSchema,
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			locationCode: z.string().trim().min(1).max(64).nullable().optional(),
			jurisdiction: z.string().trim().min(1).max(64).nullable().optional(),
		})
		.strict();

export const endWorkCalendarAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesEmploymentCalendarAssignmentIdSchema,
			effectiveTo: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const resolveEmploymentCalendarInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			asOf: isoDateSchema,
		})
		.strict();

export const assignWorkCalendarScopeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			scopeType: workCalendarScopeTypeSchema,
			scopeKey: z.string().trim().min(1).max(128),
			calendarId: humanResourcesWorkCalendarIdSchema,
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
		})
		.strict();

export const endWorkCalendarScopeAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesWorkCalendarScopeAssignmentIdSchema,
			effectiveTo: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const resolveEmployeeWorkCalendarInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			asOf: isoDateSchema,
		})
		.strict();

export const createTimePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(200),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		minimumRestMinutes: z.number().int().nonnegative().max(2880),
		automaticBreakAfterMinutes: positiveMinutesSchema.nullable().optional(),
		automaticBreakMinutes: minutesSchema.optional(),
		approvalSteps: z
			.array(timeApprovalAuthoritySchema)
			.min(1)
			.max(4)
			.refine(
				(steps) => new Set(steps).size === steps.length,
				"Approval steps must be unique",
			),
		idempotencyKey: humanResourcesIdempotencyKeySchema,
	})
	.strict();

export const activateTimePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesTimePolicyIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const supersedeTimePolicyInputSchema = createTimePolicyInputSchema
	.omit({ code: true })
	.extend({
		policyId: humanResourcesTimePolicyIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const assignTimePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesTimePolicyIdSchema,
		employmentId: humanResourcesEmploymentIdSchema,
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
	})
	.strict();

export const getTimePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesTimePolicyIdSchema,
	})
	.strict();

export const resolveTimePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		employmentId: humanResourcesEmploymentIdSchema,
		asOf: isoDateSchema,
	})
	.strict();

export const assignTimeApprovalAuthorityInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			targetActorUserId: z.string().trim().min(1).max(200),
			authority: timeApprovalAuthoritySchema,
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
		})
		.strict();

export const endTimeApprovalAuthorityAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesTimeApprovalAuthorityAssignmentIdSchema,
			effectiveTo: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

// Shift definition
export const createShiftInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(200),
		shiftKind: shiftKindSchema,
		startLocal: timeOfDaySchema,
		endLocal: timeOfDaySchema,
		isOvernight: z.boolean().optional(),
		expectedMinutes: positiveMinutesSchema,
		graceEarlyMinutes: minutesSchema.optional(),
		graceLateMinutes: minutesSchema.optional(),
		minDurationMinutes: minutesSchema.nullable().optional(),
		maxDurationMinutes: minutesSchema.nullable().optional(),
		earliestClockInLocal: timeOfDaySchema.nullable().optional(),
		latestClockOutLocal: timeOfDaySchema.nullable().optional(),
		overtimeEligible: z.boolean().optional(),
		timezone: timezoneSchema.nullable().optional(),
		locationKey: z.string().trim().min(1).max(128).nullable().optional(),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: humanResourcesIdempotencyKeySchema,
	})
	.strict();

export const updateShiftInputSchema = humanResourcesMutationContextSchema
	.extend({
		shiftId: humanResourcesShiftIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		shiftKind: shiftKindSchema.optional(),
		startLocal: timeOfDaySchema.optional(),
		endLocal: timeOfDaySchema.optional(),
		isOvernight: z.boolean().optional(),
		expectedMinutes: positiveMinutesSchema.optional(),
		graceEarlyMinutes: minutesSchema.optional(),
		graceLateMinutes: minutesSchema.optional(),
		minDurationMinutes: minutesSchema.nullable().optional(),
		maxDurationMinutes: minutesSchema.nullable().optional(),
		earliestClockInLocal: timeOfDaySchema.nullable().optional(),
		latestClockOutLocal: timeOfDaySchema.nullable().optional(),
		overtimeEligible: z.boolean().optional(),
		timezone: timezoneSchema.nullable().optional(),
		locationKey: z.string().trim().min(1).max(128).nullable().optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const supersedeShiftInputSchema = humanResourcesMutationContextSchema
	.extend({
		shiftId: humanResourcesShiftIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		shiftKind: shiftKindSchema.optional(),
		startLocal: timeOfDaySchema.optional(),
		endLocal: timeOfDaySchema.optional(),
		isOvernight: z.boolean().optional(),
		expectedMinutes: positiveMinutesSchema.optional(),
		graceEarlyMinutes: minutesSchema.optional(),
		graceLateMinutes: minutesSchema.optional(),
		minDurationMinutes: minutesSchema.nullable().optional(),
		maxDurationMinutes: minutesSchema.nullable().optional(),
		earliestClockInLocal: timeOfDaySchema.nullable().optional(),
		latestClockOutLocal: timeOfDaySchema.nullable().optional(),
		overtimeEligible: z.boolean().optional(),
		timezone: timezoneSchema.nullable().optional(),
		locationKey: z.string().trim().min(1).max(128).nullable().optional(),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
		idempotencyKey: humanResourcesIdempotencyKeySchema,
	})
	.strict();

export const activateShiftInputSchema = humanResourcesMutationContextSchema
	.extend({
		shiftId: humanResourcesShiftIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const deactivateShiftInputSchema = humanResourcesMutationContextSchema
	.extend({
		shiftId: humanResourcesShiftIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const getShiftInputSchema = humanResourcesMutationContextSchema
	.extend({
		shiftId: humanResourcesShiftIdSchema,
	})
	.strict();

export const listShiftsInputSchema = humanResourcesMutationContextSchema
	.extend({
		status: z.enum(["draft", "active", "superseded", "inactive"]).optional(),
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
	})
	.strict();

export const addShiftBreakInputSchema = humanResourcesMutationContextSchema
	.extend({
		shiftId: humanResourcesShiftIdSchema,
		breakOrder: z.number().int().positive().max(20).optional(),
		startOffsetMinutes: minutesSchema.nullable().optional(),
		durationMinutes: positiveMinutesSchema,
		isPaid: z.boolean().optional(),
		label: z.string().trim().min(1).max(100).nullable().optional(),
	})
	.strict();

export const removeShiftBreakInputSchema = humanResourcesMutationContextSchema
	.extend({
		breakId: humanResourcesShiftBreakIdSchema,
	})
	.strict();

export const listShiftBreaksInputSchema = humanResourcesMutationContextSchema
	.extend({
		shiftId: humanResourcesShiftIdSchema,
	})
	.strict();

// Scheduling
export const assignShiftInputSchema = humanResourcesMutationContextSchema
	.extend({
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema.nullable().optional(),
		shiftId: humanResourcesShiftIdSchema,
		scheduledDate: isoDateSchema,
		startsAt: isoDateTimeSchema,
		endsAt: isoDateTimeSchema,
		locationKey: z.string().trim().min(1).max(128).nullable().optional(),
		timezone: timezoneSchema,
		assignmentSource: z.string().trim().min(1).max(64).optional(),
		segments: z
			.array(
				z
					.object({
						segmentOrder: z.number().int().positive().max(20),
						startsAt: isoDateTimeSchema,
						endsAt: isoDateTimeSchema,
					})
					.strict(),
			)
			.min(1)
			.max(20)
			.optional(),
		idempotencyKey: humanResourcesIdempotencyKeySchema,
	})
	.strict();

export const publishShiftAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesShiftAssignmentIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const cancelShiftAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesShiftAssignmentIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const changeShiftAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesShiftAssignmentIdSchema,
			shiftId: humanResourcesShiftIdSchema.optional(),
			scheduledDate: isoDateSchema.optional(),
			startsAt: isoDateTimeSchema.optional(),
			endsAt: isoDateTimeSchema.optional(),
			locationKey: z.string().trim().min(1).max(128).nullable().optional(),
			timezone: timezoneSchema.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const completeShiftAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesShiftAssignmentIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getShiftAssignmentInputSchema = humanResourcesMutationContextSchema
	.extend({
		assignmentId: humanResourcesShiftAssignmentIdSchema,
	})
	.strict();

export const listShiftAssignmentsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			fromDate: isoDateSchema.optional(),
			toDate: isoDateSchema.optional(),
			scheduledDate: isoDateSchema.optional(),
			locationKey: z.string().trim().min(1).max(128).optional(),
			publicationStatus: z
				.enum(["planned", "published", "changed", "cancelled", "completed"])
				.optional(),
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const getScheduledShiftForEmployeeDateInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			scheduledDate: isoDateSchema,
		})
		.strict();

export const listLocationScheduleInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			locationKey: z.string().trim().min(1).max(128),
			fromDate: isoDateSchema.optional(),
			toDate: isoDateSchema.optional(),
			publicationStatus: z
				.enum(["planned", "published", "changed", "cancelled", "completed"])
				.optional(),
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

// Attendance events
export const recordAttendanceEventInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema.nullable().optional(),
			shiftAssignmentId: humanResourcesShiftAssignmentIdSchema
				.nullable()
				.optional(),
			eventType: attendanceEventTypeSchema,
			occurredAt: isoDateTimeSchema,
			sourceTimezone: timezoneSchema,
			localWorkDate: isoDateSchema,
			source: attendanceEventSourceSchema.optional(),
			sourceReference: z.string().trim().min(1).max(200).nullable().optional(),
			locationKey: z.string().trim().min(1).max(128).nullable().optional(),
			notes: z.string().trim().max(500).nullable().optional(),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const recordClockInInputSchema = recordAttendanceEventInputSchema
	.extend({
		eventType: z.literal("clock_in").optional(),
	})
	.strict();

export const recordClockOutInputSchema = recordAttendanceEventInputSchema
	.extend({
		eventType: z.literal("clock_out").optional(),
	})
	.strict();

export const recordBreakStartInputSchema = recordAttendanceEventInputSchema
	.extend({
		eventType: z.literal("break_start").optional(),
	})
	.strict();

export const recordBreakEndInputSchema = recordAttendanceEventInputSchema
	.extend({
		eventType: z.literal("break_end").optional(),
	})
	.strict();

export const recordManualAttendanceInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema.nullable().optional(),
			shiftAssignmentId: humanResourcesShiftAssignmentIdSchema
				.nullable()
				.optional(),
			eventType: attendanceEventTypeSchema,
			occurredAt: isoDateTimeSchema,
			sourceTimezone: timezoneSchema,
			localWorkDate: isoDateSchema,
			sourceReference: z.string().trim().min(1).max(200).nullable().optional(),
			locationKey: z.string().trim().min(1).max(128).nullable().optional(),
			notes: z.string().trim().max(500).nullable().optional(),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const attendanceImportEventRowSchema = z
	.object({
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema.nullable().optional(),
		shiftAssignmentId: humanResourcesShiftAssignmentIdSchema
			.nullable()
			.optional(),
		eventType: attendanceEventTypeSchema,
		occurredAt: isoDateTimeSchema,
		// IANA validity checked per-row in import (partial failure), not batch Zod.
		sourceTimezone: unverifiedTimezoneSchema,
		localWorkDate: isoDateSchema,
		sourceReference: z.string().trim().min(1).max(200),
		locationKey: z.string().trim().min(1).max(128).nullable().optional(),
		deviceMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
		payloadChecksum: z.string().trim().min(1).max(128).nullable().optional(),
		notes: z.string().trim().max(500).nullable().optional(),
	})
	.strict();

export const importAttendanceEventsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			batchId: z.string().trim().min(1).max(200),
			sourceKey: z
				.string()
				.trim()
				.min(1)
				.max(64)
				.regex(/^[a-zA-Z0-9._-]+$/),
			cursor: z.string().trim().min(1).max(500).optional(),
			events: z
				.array(attendanceImportEventRowSchema)
				.min(1)
				.max(500)
				.optional(),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const correctAttendanceEventInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			eventId: humanResourcesAttendanceEventIdSchema,
			occurredAt: isoDateTimeSchema,
			notes: z.string().trim().max(500).nullable().optional(),
			adjustmentReason: z.string().trim().min(1).max(500),
			evidenceReference: z
				.string()
				.trim()
				.min(1)
				.max(500)
				.nullable()
				.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const voidAttendanceEventInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			eventId: humanResourcesAttendanceEventIdSchema,
			voidReason: z.string().trim().min(1).max(500),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getAttendanceEventInputSchema = humanResourcesMutationContextSchema
	.extend({
		eventId: humanResourcesAttendanceEventIdSchema,
	})
	.strict();

export const listAttendanceAdjustmentsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			eventId: humanResourcesAttendanceEventIdSchema,
		})
		.strict();

export const listAttendanceEventsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			fromDate: isoDateSchema.optional(),
			toDate: isoDateSchema.optional(),
			eventType: attendanceEventTypeSchema.optional(),
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

// Attendance sessions
export const resolveAttendanceSessionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			localWorkDate: isoDateSchema,
			timezone: timezoneSchema,
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const getAttendanceSessionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			sessionId: humanResourcesAttendanceSessionIdSchema,
		})
		.strict();

export const listAttendanceSessionsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			fromDate: isoDateSchema.optional(),
			toDate: isoDateSchema.optional(),
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const approveAttendanceBreakWaiverInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			sessionId: humanResourcesAttendanceSessionIdSchema,
			authority: timeApprovalAuthoritySchema,
			reason: z.string().trim().min(1).max(1000),
			evidenceReference: z.string().trim().min(1).max(500),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const listAttendanceBreakWaiverDecisionsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			sessionId: humanResourcesAttendanceSessionIdSchema,
		})
		.strict();

// Attendance exceptions
export const createAttendanceExceptionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			sessionId: humanResourcesAttendanceSessionIdSchema.nullable().optional(),
			eventId: humanResourcesAttendanceEventIdSchema.nullable().optional(),
			shiftAssignmentId: humanResourcesShiftAssignmentIdSchema
				.nullable()
				.optional(),
			exceptionType: exceptionTypeSchema,
			severity: z.enum(["info", "warning", "critical"]),
			remarks: z.string().trim().max(1000).nullable().optional(),
		})
		.strict();

export const reviewAttendanceExceptionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			exceptionId: humanResourcesAttendanceExceptionIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const excuseAttendanceExceptionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			exceptionId: humanResourcesAttendanceExceptionIdSchema,
			resolution: z.string().trim().min(1).max(1000),
			evidenceReference: z
				.string()
				.trim()
				.min(1)
				.max(200)
				.nullable()
				.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const rejectAttendanceExceptionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			exceptionId: humanResourcesAttendanceExceptionIdSchema,
			resolution: z.string().trim().min(1).max(1000),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const resolveAttendanceExceptionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			exceptionId: humanResourcesAttendanceExceptionIdSchema,
			resolution: z.string().trim().min(1).max(1000),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getAttendanceExceptionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			exceptionId: humanResourcesAttendanceExceptionIdSchema,
		})
		.strict();

export const listAttendanceExceptionsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			reviewStatus: z
				.enum(["open", "in_review", "excused", "rejected", "resolved"])
				.optional(),
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const listUnresolvedAttendanceExceptionsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const getDailyAttendanceSummaryInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			localWorkDate: isoDateSchema,
			timezone: timezoneSchema,
		})
		.strict();

// Timesheet
export const createTimesheetInputSchema = humanResourcesMutationContextSchema
	.extend({
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema.nullable().optional(),
		periodStart: isoDateSchema,
		periodEnd: isoDateSchema,
		idempotencyKey: humanResourcesIdempotencyKeySchema,
	})
	.strict();

export const generateTimesheetEntriesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			timesheetId: humanResourcesTimesheetIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const addTimesheetEntryInputSchema = humanResourcesMutationContextSchema
	.extend({
		timesheetId: humanResourcesTimesheetIdSchema,
		employeeId: humanResourcesEmployeeIdSchema,
		workDate: isoDateSchema,
		timezone: timezoneSchema,
		sourceType: timesheetEntrySourceTypeSchema,
		sourceReference: z.string().trim().min(1).max(200).nullable().optional(),
		timeType: timesheetEntryTimeTypeSchema,
		startedAt: isoDateTimeSchema.nullable().optional(),
		endedAt: isoDateTimeSchema.nullable().optional(),
		recordedMinutes: minutesSchema,
		approvedMinutes: minutesSchema.optional(),
		costCenterId: nullableReferenceSchema,
		projectId: nullableReferenceSchema,
		locationId: nullableReferenceSchema,
		departmentId: nullableReferenceSchema,
		approvalReference: nullableReferenceSchema,
		evidenceReference: nullableReferenceSchema,
	})
	.strict();

export const updateTimesheetEntryInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entryId: humanResourcesTimesheetEntryIdSchema,
			workDate: isoDateSchema.optional(),
			timeType: timesheetEntryTimeTypeSchema.optional(),
			startedAt: isoDateTimeSchema.nullable().optional(),
			endedAt: isoDateTimeSchema.nullable().optional(),
			recordedMinutes: minutesSchema.optional(),
			approvedMinutes: minutesSchema.optional(),
			costCenterId: nullableReferenceSchema,
			projectId: nullableReferenceSchema,
			locationId: nullableReferenceSchema,
			departmentId: nullableReferenceSchema,
			approvalReference: nullableReferenceSchema,
			evidenceReference: nullableReferenceSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const removeTimesheetEntryInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entryId: humanResourcesTimesheetEntryIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const submitTimesheetInputSchema = humanResourcesMutationContextSchema
	.extend({
		timesheetId: humanResourcesTimesheetIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const returnTimesheetInputSchema = humanResourcesMutationContextSchema
	.extend({
		timesheetId: humanResourcesTimesheetIdSchema,
		approverNotes: z.string().trim().max(1000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const approveTimesheetInputSchema = humanResourcesMutationContextSchema
	.extend({
		timesheetId: humanResourcesTimesheetIdSchema,
		authority: timeApprovalAuthoritySchema,
		approverNotes: z.string().trim().max(1000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const listTimesheetApprovalDecisionsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			timesheetId: humanResourcesTimesheetIdSchema,
			submissionReference: z.string().uuid().optional(),
		})
		.strict();

export const rejectTimesheetInputSchema = humanResourcesMutationContextSchema
	.extend({
		timesheetId: humanResourcesTimesheetIdSchema,
		rejectionReason: z.string().trim().min(1).max(500),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const reopenTimesheetInputSchema = humanResourcesMutationContextSchema
	.extend({
		timesheetId: humanResourcesTimesheetIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const lockTimesheetInputSchema = humanResourcesMutationContextSchema
	.extend({
		timesheetId: humanResourcesTimesheetIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const supersedeTimesheetInputSchema = humanResourcesMutationContextSchema
	.extend({
		timesheetId: humanResourcesTimesheetIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
		idempotencyKey: humanResourcesIdempotencyKeySchema,
	})
	.strict();

export const getTimesheetInputSchema = humanResourcesMutationContextSchema
	.extend({
		timesheetId: humanResourcesTimesheetIdSchema,
	})
	.strict();

export const getTimesheetForEmployeePeriodInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
		})
		.strict();

export const listTimesheetsInputSchema = humanResourcesMutationContextSchema
	.extend({
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		status: timesheetStatusSchema.optional(),
		periodStart: isoDateSchema.optional(),
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
	})
	.strict();

export const listTimesheetEntriesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			timesheetId: humanResourcesTimesheetIdSchema,
		})
		.strict();

export const getTimesheetTotalsInputSchema = humanResourcesMutationContextSchema
	.extend({
		timesheetId: humanResourcesTimesheetIdSchema,
	})
	.strict();

export const getApprovedTimeHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			timesheetId: humanResourcesTimesheetIdSchema,
		})
		.strict();

// Overtime
export const createOvertimeRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema.nullable().optional(),
			overtimeType: overtimeTypeSchema,
			requestedStartsAt: isoDateTimeSchema,
			requestedEndsAt: isoDateTimeSchema,
			requestedMinutes: positiveMinutesSchema,
			reason: z.string().trim().min(1).max(1000),
			evidenceReference: z
				.string()
				.trim()
				.min(1)
				.max(200)
				.nullable()
				.optional(),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const approveOvertimeRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesOvertimeRequestIdSchema,
			approvedMaximumMinutes: positiveMinutesSchema,
			comment: z.string().trim().max(1000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const rejectOvertimeRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesOvertimeRequestIdSchema,
			comment: z.string().trim().min(1).max(1000),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const cancelOvertimeRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesOvertimeRequestIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const recordOvertimeActualInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesOvertimeRequestIdSchema,
			actualMinutes: positiveMinutesSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const verifyOvertimeRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesOvertimeRequestIdSchema,
			payrollApprovedMinutes: positiveMinutesSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getOvertimeRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesOvertimeRequestIdSchema,
	})
	.strict();

export const listOvertimeRequestsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			status: z
				.enum([
					"requested",
					"approved",
					"rejected",
					"worked",
					"verified",
					"cancelled",
				])
				.optional(),
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const listPendingOvertimeApprovalsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

// Keep exception type schema exported for adapters that validate detected facts.
export {
	exceptionTypeSchema,
	humanResourcesEmploymentCalendarAssignmentIdSchema,
};
