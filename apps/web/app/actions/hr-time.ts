"use server";

import {
	approveTimesheet,
	archiveWorkCalendar,
	assignShift,
	createOvertimeRequest,
	createShift,
	createTimesheet,
	createWorkCalendar,
	generateTimesheetEntries,
	getApprovedTimeHandoff,
	publishShiftAssignment,
	recordBreakEnd,
	recordBreakStart,
	recordClockIn,
	recordClockOut,
	resolveAttendanceException,
	submitTimesheet,
	updateWorkCalendar,
	type ApprovedTimeHandoff,
	type AttendanceEvent,
	type AttendanceException,
	type OvertimeRequest,
	type Shift,
	type ShiftAssignment,
	type Timesheet,
	type TimesheetEntry,
	type WorkCalendar,
} from "@afenda/human-resources";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const mutationContextSchema = z.object({
	correlationId: z.string().trim().min(1).max(128).optional(),
});

const workWeekDaySchema = z.object({
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
	standardStartTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/)
		.nullable(),
	standardEndTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/)
		.nullable(),
	standardMinutes: z.number().int().nonnegative().max(1440).nullable(),
});

const clockEventInputSchema = mutationContextSchema.extend({
	idempotencyKey: z.string().trim().min(1).max(128),
	employeeId: z.string().uuid(),
	employmentId: z.string().uuid().nullable().optional(),
	shiftAssignmentId: z.string().uuid().nullable().optional(),
	occurredAt: z.string().datetime({ offset: true }),
	sourceTimezone: z.string().trim().min(1).max(64),
	localWorkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	locationKey: z.string().trim().min(1).max(128).nullable().optional(),
	notes: z.string().trim().max(2000).nullable().optional(),
});

function withSessionContext<T extends Record<string, unknown>>(
	session: { orgId: string; userId: string },
	correlationId: string,
	data: T,
) {
	return {
		organizationId: session.orgId,
		actorUserId: session.userId,
		correlationId: data.correlationId ?? correlationId,
		...data,
	};
}

export async function createWorkCalendarAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	code: string;
	name: string;
	timezone: string;
	calendarVersion: string;
	workWeek: Array<{
		dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
		isWorkingDay: boolean;
		standardStartTime: string | null;
		standardEndTime: string | null;
		standardMinutes: number | null;
	}>;
	standardHoursPerDay: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
}): Promise<ActionResult<{ calendar: WorkCalendar }>> {
	return runOperatorPermissionAction({
		path: "createWorkCalendarAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not create work calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					code: z.string().trim().min(1).max(64),
					name: z.string().trim().min(1).max(200),
					timezone: z.string().trim().min(1).max(64),
					calendarVersion: z.string().trim().min(1).max(64),
					workWeek: z.array(workWeekDaySchema).length(7),
					standardHoursPerDay: z.string().regex(/^\d+(\.\d{1,2})?$/),
					effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
					effectiveTo: z
						.string()
						.regex(/^\d{4}-\d{2}-\d{2}$/)
						.nullable()
						.optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid work calendar.",
					parsed.details,
				);
			}
			const result = await createWorkCalendar(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { calendar: mapped.data } };
		},
	});
}

export async function updateWorkCalendarAction(input: {
	correlationId?: string;
	calendarId: string;
	expectedVersion: number;
	name?: string;
	timezone?: string;
	calendarVersion?: string;
	workWeek?: Array<{
		dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
		isWorkingDay: boolean;
		standardStartTime: string | null;
		standardEndTime: string | null;
		standardMinutes: number | null;
	}>;
	standardHoursPerDay?: string;
	effectiveTo?: string | null;
}): Promise<ActionResult<{ calendar: WorkCalendar }>> {
	return runOperatorPermissionAction({
		path: "updateWorkCalendarAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not update work calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					calendarId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					name: z.string().trim().min(1).max(200).optional(),
					timezone: z.string().trim().min(1).max(64).optional(),
					calendarVersion: z.string().trim().min(1).max(64).optional(),
					workWeek: z.array(workWeekDaySchema).length(7).optional(),
					standardHoursPerDay: z
						.string()
						.regex(/^\d+(\.\d{1,2})?$/)
						.optional(),
					effectiveTo: z
						.string()
						.regex(/^\d{4}-\d{2}-\d{2}$/)
						.nullable()
						.optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid work calendar update.",
					parsed.details,
				);
			}
			const result = await updateWorkCalendar(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { calendar: mapped.data } };
		},
	});
}

export async function archiveWorkCalendarAction(input: {
	correlationId?: string;
	calendarId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ calendar: WorkCalendar }>> {
	return runOperatorPermissionAction({
		path: "archiveWorkCalendarAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not archive work calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					calendarId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid work calendar archive request.",
					parsed.details,
				);
			}
			const result = await archiveWorkCalendar(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { calendar: mapped.data } };
		},
	});
}

export async function createShiftAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	code: string;
	name: string;
	shiftKind: "fixed" | "flexible" | "split" | "rest_day" | "public_holiday";
	startLocal: string;
	endLocal: string;
	isOvernight?: boolean;
	expectedMinutes: number;
	effectiveFrom: string;
	effectiveTo?: string | null;
}): Promise<ActionResult<{ shift: Shift }>> {
	return runOperatorPermissionAction({
		path: "createShiftAction",
		permission: "human-resources.time.shift.manage",
		safeMessage: "Could not create shift.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					code: z.string().trim().min(1).max(64),
					name: z.string().trim().min(1).max(200),
					shiftKind: z.enum([
						"fixed",
						"flexible",
						"split",
						"rest_day",
						"public_holiday",
					]),
					startLocal: z.string().regex(/^\d{2}:\d{2}$/),
					endLocal: z.string().regex(/^\d{2}:\d{2}$/),
					isOvernight: z.boolean().optional(),
					expectedMinutes: z.number().int().positive().max(1440),
					effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
					effectiveTo: z
						.string()
						.regex(/^\d{4}-\d{2}-\d{2}$/)
						.nullable()
						.optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail("VALIDATION_ERROR", "Enter a valid shift.", parsed.details);
			}
			const result = await createShift(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { shift: mapped.data } };
		},
	});
}

export async function assignShiftAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeId: string;
	employmentId?: string | null;
	shiftId: string;
	scheduledDate: string;
	startsAt: string;
	endsAt: string;
	timezone: string;
	locationKey?: string | null;
}): Promise<ActionResult<{ assignment: ShiftAssignment }>> {
	return runOperatorPermissionAction({
		path: "assignShiftAction",
		permission: "human-resources.time.schedule.manage",
		safeMessage: "Could not assign shift.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					employeeId: z.string().uuid(),
					employmentId: z.string().uuid().nullable().optional(),
					shiftId: z.string().uuid(),
					scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
					startsAt: z.string().datetime({ offset: true }),
					endsAt: z.string().datetime({ offset: true }),
					timezone: z.string().trim().min(1).max(64),
					locationKey: z.string().trim().min(1).max(128).nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid shift assignment.",
					parsed.details,
				);
			}
			const result = await assignShift(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function publishShiftAssignmentAction(input: {
	correlationId?: string;
	assignmentId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ assignment: ShiftAssignment }>> {
	return runOperatorPermissionAction({
		path: "publishShiftAssignmentAction",
		permission: "human-resources.time.schedule.publish",
		safeMessage: "Could not publish shift assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					assignmentId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid schedule publish request.",
					parsed.details,
				);
			}
			const result = await publishShiftAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function recordClockInAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeId: string;
	employmentId?: string | null;
	shiftAssignmentId?: string | null;
	occurredAt: string;
	sourceTimezone: string;
	localWorkDate: string;
	locationKey?: string | null;
	notes?: string | null;
}): Promise<ActionResult<{ event: AttendanceEvent }>> {
	return runOperatorPermissionAction({
		path: "recordClockInAction",
		permission: "human-resources.time.attendance.self.record",
		safeMessage: "Could not record clock-in.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(clockEventInputSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid clock-in.",
					parsed.details,
				);
			}
			const result = await recordClockIn(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { event: mapped.data } };
		},
	});
}

export async function recordClockOutAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeId: string;
	employmentId?: string | null;
	shiftAssignmentId?: string | null;
	occurredAt: string;
	sourceTimezone: string;
	localWorkDate: string;
	locationKey?: string | null;
	notes?: string | null;
}): Promise<ActionResult<{ event: AttendanceEvent }>> {
	return runOperatorPermissionAction({
		path: "recordClockOutAction",
		permission: "human-resources.time.attendance.self.record",
		safeMessage: "Could not record clock-out.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(clockEventInputSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid clock-out.",
					parsed.details,
				);
			}
			const result = await recordClockOut(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { event: mapped.data } };
		},
	});
}

export async function recordBreakStartAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeId: string;
	employmentId?: string | null;
	shiftAssignmentId?: string | null;
	occurredAt: string;
	sourceTimezone: string;
	localWorkDate: string;
	locationKey?: string | null;
	notes?: string | null;
}): Promise<ActionResult<{ event: AttendanceEvent }>> {
	return runOperatorPermissionAction({
		path: "recordBreakStartAction",
		permission: "human-resources.time.attendance.self.record",
		safeMessage: "Could not record break start.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(clockEventInputSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid break start.",
					parsed.details,
				);
			}
			const result = await recordBreakStart(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { event: mapped.data } };
		},
	});
}

export async function recordBreakEndAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeId: string;
	employmentId?: string | null;
	shiftAssignmentId?: string | null;
	occurredAt: string;
	sourceTimezone: string;
	localWorkDate: string;
	locationKey?: string | null;
	notes?: string | null;
}): Promise<ActionResult<{ event: AttendanceEvent }>> {
	return runOperatorPermissionAction({
		path: "recordBreakEndAction",
		permission: "human-resources.time.attendance.self.record",
		safeMessage: "Could not record break end.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(clockEventInputSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid break end.",
					parsed.details,
				);
			}
			const result = await recordBreakEnd(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { event: mapped.data } };
		},
	});
}

export async function resolveAttendanceExceptionAction(input: {
	correlationId?: string;
	exceptionId: string;
	resolution: string;
	expectedVersion: number;
}): Promise<ActionResult<{ exception: AttendanceException }>> {
	return runOperatorPermissionAction({
		path: "resolveAttendanceExceptionAction",
		permission: "human-resources.time.exception.resolve",
		safeMessage: "Could not resolve attendance exception.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					exceptionId: z.string().uuid(),
					resolution: z.string().trim().min(1).max(1000),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid exception resolution.",
					parsed.details,
				);
			}
			const result = await resolveAttendanceException(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { exception: mapped.data } };
		},
	});
}

export async function createTimesheetAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeId: string;
	employmentId?: string | null;
	periodStart: string;
	periodEnd: string;
}): Promise<ActionResult<{ timesheet: Timesheet }>> {
	return runOperatorPermissionAction({
		path: "createTimesheetAction",
		permission: "human-resources.time.timesheet.self.edit",
		safeMessage: "Could not create timesheet.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					employeeId: z.string().uuid(),
					employmentId: z.string().uuid().nullable().optional(),
					periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
					periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid timesheet.",
					parsed.details,
				);
			}
			const result = await createTimesheet(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { timesheet: mapped.data } };
		},
	});
}

export async function generateTimesheetEntriesAction(input: {
	correlationId?: string;
	timesheetId: string;
	expectedVersion: number;
}): Promise<
	ActionResult<{ timesheet: Timesheet; entries: TimesheetEntry[] }>
> {
	return runOperatorPermissionAction({
		path: "generateTimesheetEntriesAction",
		permission: "human-resources.time.timesheet.self.edit",
		safeMessage: "Could not generate timesheet entries.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					timesheetId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid timesheet generate request.",
					parsed.details,
				);
			}
			const result = await generateTimesheetEntries(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return {
				ok: true,
				data: {
					timesheet: mapped.data.timesheet,
					entries: mapped.data.entries,
				},
			};
		},
	});
}

export async function submitTimesheetAction(input: {
	correlationId?: string;
	timesheetId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ timesheet: Timesheet }>> {
	return runOperatorPermissionAction({
		path: "submitTimesheetAction",
		permission: "human-resources.time.timesheet.submit",
		safeMessage: "Could not submit timesheet.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					timesheetId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid timesheet submit request.",
					parsed.details,
				);
			}
			const result = await submitTimesheet(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { timesheet: mapped.data } };
		},
	});
}

export async function approveTimesheetAction(input: {
	correlationId?: string;
	timesheetId: string;
	expectedVersion: number;
	approverNotes?: string | null;
}): Promise<ActionResult<{ timesheet: Timesheet }>> {
	return runOperatorPermissionAction({
		path: "approveTimesheetAction",
		permission: "human-resources.time.timesheet.approve",
		safeMessage: "Could not approve timesheet.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					timesheetId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					approverNotes: z.string().trim().max(2000).nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid timesheet approval.",
					parsed.details,
				);
			}
			const result = await approveTimesheet(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { timesheet: mapped.data } };
		},
	});
}

export async function createOvertimeRequestAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeId: string;
	employmentId?: string | null;
	overtimeType:
		| "weekday_overtime"
		| "rest_day_overtime"
		| "public_holiday_overtime"
		| "night_overtime"
		| "call_back";
	requestedStartsAt: string;
	requestedEndsAt: string;
	requestedMinutes: number;
	reason: string;
	evidenceReference?: string | null;
}): Promise<ActionResult<{ request: OvertimeRequest }>> {
	return runOperatorPermissionAction({
		path: "createOvertimeRequestAction",
		permission: "human-resources.time.overtime.request",
		safeMessage: "Could not create overtime request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					employeeId: z.string().uuid(),
					employmentId: z.string().uuid().nullable().optional(),
					overtimeType: z.enum([
						"weekday_overtime",
						"rest_day_overtime",
						"public_holiday_overtime",
						"night_overtime",
						"call_back",
					]),
					requestedStartsAt: z.string().datetime({ offset: true }),
					requestedEndsAt: z.string().datetime({ offset: true }),
					requestedMinutes: z.number().int().positive().max(1440),
					reason: z.string().trim().min(1).max(1000),
					evidenceReference: z
						.string()
						.trim()
						.min(1)
						.max(200)
						.nullable()
						.optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid overtime request.",
					parsed.details,
				);
			}
			const result = await createOvertimeRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function getApprovedTimeHandoffAction(input: {
	correlationId?: string;
	timesheetId: string;
}): Promise<ActionResult<{ handoff: ApprovedTimeHandoff | null }>> {
	return runOperatorPermissionAction({
		path: "getApprovedTimeHandoffAction",
		permission: "human-resources.time.handoff.read",
		safeMessage: "Could not get approved time handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					timesheetId: z.string().uuid(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid timesheet handoff request.",
					parsed.details,
				);
			}
			const result = await getApprovedTimeHandoff(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { handoff: mapped.data } };
		},
	});
}
