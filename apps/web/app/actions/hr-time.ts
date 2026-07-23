"use server";

import {
	type ApprovedTimeHandoff,
	type AttendanceBreakWaiverDecision,
	type AttendanceEvent,
	type AttendanceException,
	activateTimePolicy,
	approveAttendanceBreakWaiver,
	approveTimesheet,
	archiveWorkCalendar,
	assignShift,
	assignTimeApprovalAuthority,
	assignTimePolicy,
	correctAttendanceEvent,
	createOvertimeRequest,
	createShift,
	createTimePolicy,
	createTimesheet,
	createWorkCalendar,
	endTimeApprovalAuthorityAssignment,
	generateTimesheetEntries,
	getApprovedTimeHandoff,
	importAttendanceEvents,
	lockTimesheet,
	type OvertimeRequest,
	publishShiftAssignment,
	recordBreakEnd,
	recordBreakStart,
	recordClockIn,
	recordClockOut,
	rejectTimesheet,
	reopenTimesheet,
	resolveAttendanceException,
	resolveAttendanceSession,
	returnTimesheet,
	type Shift,
	type ShiftAssignment,
	submitTimesheet,
	supersedeShift,
	supersedeTimePolicy,
	supersedeTimesheet,
	supersedeWorkCalendar,
	type AttendanceImportResult,
	type AttendanceSession,
	type TimeApprovalAuthorityAssignment,
	type TimePolicy,
	type TimePolicyAssignment,
	type Timesheet,
	type TimesheetEntry,
	updateWorkCalendar,
	voidAttendanceEvent,
	type WorkCalendar,
} from "@afenda/human-resources";
import { z } from "zod";

import {
	hrMutationContextSchema as mutationContextSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeApprovalAuthoritySchema = z.enum([
	"line_manager",
	"department",
	"hr",
	"payroll",
]);

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

export async function supersedeWorkCalendarAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	calendarId: string;
	expectedVersion: number;
	calendarVersion: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	name?: string;
	timezone?: string;
	workWeek?: Array<{
		dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
		isWorkingDay: boolean;
		standardStartTime: string | null;
		standardEndTime: string | null;
		standardMinutes: number | null;
	}>;
	standardHoursPerDay?: string;
}): Promise<
	ActionResult<{ superseded: WorkCalendar; successor: WorkCalendar }>
> {
	return runOperatorPermissionAction({
		path: "supersedeWorkCalendarAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not supersede work calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					calendarId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					calendarVersion: z.string().trim().min(1).max(64),
					effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
					effectiveTo: z
						.string()
						.regex(/^\d{4}-\d{2}-\d{2}$/)
						.nullable()
						.optional(),
					name: z.string().trim().min(1).max(200).optional(),
					timezone: z.string().trim().min(1).max(64).optional(),
					workWeek: z.array(workWeekDaySchema).length(7).optional(),
					standardHoursPerDay: z
						.string()
						.regex(/^\d+(\.\d{1,2})?$/)
						.optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid work calendar successor.",
					parsed.details,
				);
			}
			const result = await supersedeWorkCalendar(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return {
				ok: true,
				data: {
					superseded: mapped.data.superseded,
					successor: mapped.data.successor,
				},
			};
		},
	});
}

export async function createTimePolicyAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	code: string;
	name: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	minimumRestMinutes: number;
	automaticBreakAfterMinutes?: number | null;
	automaticBreakMinutes?: number;
	approvalSteps: Array<"line_manager" | "department" | "hr" | "payroll">;
}): Promise<ActionResult<{ policy: TimePolicy }>> {
	return runOperatorPermissionAction({
		path: "createTimePolicyAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not create Time policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					code: z.string().trim().min(1).max(64),
					name: z.string().trim().min(1).max(200),
					effectiveFrom: isoDateSchema,
					effectiveTo: isoDateSchema.nullable().optional(),
					minimumRestMinutes: z.number().int().nonnegative().max(2880),
					automaticBreakAfterMinutes: z
						.number()
						.int()
						.positive()
						.max(1440)
						.nullable()
						.optional(),
					automaticBreakMinutes: z
						.number()
						.int()
						.nonnegative()
						.max(1440)
						.optional(),
					approvalSteps: z
						.array(timeApprovalAuthoritySchema)
						.min(1)
						.max(4)
						.refine(
							(steps) => new Set(steps).size === steps.length,
							"Approval steps must be unique",
						),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid Time policy.",
					parsed.details,
				);
			}
			const result = await createTimePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function activateTimePolicyAction(input: {
	correlationId?: string;
	policyId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ policy: TimePolicy }>> {
	return runOperatorPermissionAction({
		path: "activateTimePolicyAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not activate Time policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					policyId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid Time policy activation.",
					parsed.details,
				);
			}
			const result = await activateTimePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function supersedeTimePolicyAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	policyId: string;
	expectedVersion: number;
	name: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	minimumRestMinutes: number;
	automaticBreakAfterMinutes?: number | null;
	automaticBreakMinutes?: number;
	approvalSteps: Array<"line_manager" | "department" | "hr" | "payroll">;
}): Promise<ActionResult<{ superseded: TimePolicy; successor: TimePolicy }>> {
	return runOperatorPermissionAction({
		path: "supersedeTimePolicyAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not supersede Time policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					policyId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					name: z.string().trim().min(1).max(200),
					effectiveFrom: isoDateSchema,
					effectiveTo: isoDateSchema.nullable().optional(),
					minimumRestMinutes: z.number().int().nonnegative().max(2880),
					automaticBreakAfterMinutes: z
						.number()
						.int()
						.positive()
						.max(1440)
						.nullable()
						.optional(),
					automaticBreakMinutes: z
						.number()
						.int()
						.nonnegative()
						.max(1440)
						.optional(),
					approvalSteps: z
						.array(timeApprovalAuthoritySchema)
						.min(1)
						.max(4)
						.refine(
							(steps) => new Set(steps).size === steps.length,
							"Approval steps must be unique",
						),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid Time policy successor.",
					parsed.details,
				);
			}
			const result = await supersedeTimePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return {
				ok: true,
				data: {
					superseded: mapped.data.superseded,
					successor: mapped.data.successor,
				},
			};
		},
	});
}

export async function assignTimePolicyAction(input: {
	correlationId?: string;
	policyId: string;
	employmentId: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
}): Promise<ActionResult<{ assignment: TimePolicyAssignment }>> {
	return runOperatorPermissionAction({
		path: "assignTimePolicyAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not assign Time policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					policyId: z.string().uuid(),
					employmentId: z.string().uuid(),
					effectiveFrom: isoDateSchema,
					effectiveTo: isoDateSchema.nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid Time policy assignment.",
					parsed.details,
				);
			}
			const result = await assignTimePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function assignTimeApprovalAuthorityAction(input: {
	correlationId?: string;
	targetActorUserId: string;
	authority: "line_manager" | "department" | "hr" | "payroll";
	effectiveFrom: string;
	effectiveTo?: string | null;
}): Promise<ActionResult<{ assignment: TimeApprovalAuthorityAssignment }>> {
	return runOperatorPermissionAction({
		path: "assignTimeApprovalAuthorityAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not assign Time approval authority.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					targetActorUserId: z.string().trim().min(1).max(200),
					authority: timeApprovalAuthoritySchema,
					effectiveFrom: isoDateSchema,
					effectiveTo: isoDateSchema.nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid Time approval-authority assignment.",
					parsed.details,
				);
			}
			const result = await assignTimeApprovalAuthority(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function endTimeApprovalAuthorityAssignmentAction(input: {
	correlationId?: string;
	assignmentId: string;
	effectiveTo: string;
	expectedVersion: number;
}): Promise<ActionResult<{ assignment: TimeApprovalAuthorityAssignment }>> {
	return runOperatorPermissionAction({
		path: "endTimeApprovalAuthorityAssignmentAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not end Time approval authority.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					assignmentId: z.string().uuid(),
					effectiveTo: isoDateSchema,
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid Time approval-authority end request.",
					parsed.details,
				);
			}
			const result = await endTimeApprovalAuthorityAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { assignment: mapped.data } };
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid shift.",
					parsed.details,
				);
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

export async function supersedeShiftAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	shiftId: string;
	expectedVersion: number;
	effectiveFrom: string;
	effectiveTo?: string | null;
	name?: string;
	shiftKind?: "fixed" | "flexible" | "split" | "rest_day" | "public_holiday";
	startLocal?: string;
	endLocal?: string;
	isOvernight?: boolean;
	expectedMinutes?: number;
	graceEarlyMinutes?: number;
	graceLateMinutes?: number;
	minDurationMinutes?: number | null;
	maxDurationMinutes?: number | null;
	earliestClockInLocal?: string | null;
	latestClockOutLocal?: string | null;
	overtimeEligible?: boolean;
	timezone?: string | null;
	locationKey?: string | null;
}): Promise<ActionResult<{ superseded: Shift; successor: Shift }>> {
	return runOperatorPermissionAction({
		path: "supersedeShiftAction",
		permission: "human-resources.time.shift.manage",
		safeMessage: "Could not supersede shift.",
		execute: async (session, correlationId) => {
			const minutes = z.number().int().min(0).max(1440);
			const localTime = z.string().regex(/^\d{2}:\d{2}$/);
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					shiftId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
					effectiveTo: z
						.string()
						.regex(/^\d{4}-\d{2}-\d{2}$/)
						.nullable()
						.optional(),
					name: z.string().trim().min(1).max(200).optional(),
					shiftKind: z
						.enum(["fixed", "flexible", "split", "rest_day", "public_holiday"])
						.optional(),
					startLocal: localTime.optional(),
					endLocal: localTime.optional(),
					isOvernight: z.boolean().optional(),
					expectedMinutes: z.number().int().positive().max(1440).optional(),
					graceEarlyMinutes: minutes.optional(),
					graceLateMinutes: minutes.optional(),
					minDurationMinutes: minutes.nullable().optional(),
					maxDurationMinutes: minutes.nullable().optional(),
					earliestClockInLocal: localTime.nullable().optional(),
					latestClockOutLocal: localTime.nullable().optional(),
					overtimeEligible: z.boolean().optional(),
					timezone: z.string().trim().min(1).max(64).nullable().optional(),
					locationKey: z.string().trim().min(1).max(128).nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid shift successor.",
					parsed.details,
				);
			}
			const result = await supersedeShift(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return {
				ok: true,
				data: {
					superseded: mapped.data.superseded,
					successor: mapped.data.successor,
				},
			};
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

export async function approveAttendanceBreakWaiverAction(input: {
	correlationId?: string;
	sessionId: string;
	authority: "line_manager" | "department" | "hr" | "payroll";
	reason: string;
	evidenceReference: string;
	expectedVersion: number;
}): Promise<ActionResult<{ decision: AttendanceBreakWaiverDecision }>> {
	return runOperatorPermissionAction({
		path: "approveAttendanceBreakWaiverAction",
		permission: "human-resources.time.attendance.correct",
		safeMessage: "Could not approve attendance break waiver.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					sessionId: z.string().uuid(),
					authority: timeApprovalAuthoritySchema,
					reason: z.string().trim().min(1).max(1000),
					evidenceReference: z.string().trim().min(1).max(500),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid attendance break-waiver approval.",
					parsed.details,
				);
			}
			const result = await approveAttendanceBreakWaiver(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { decision: mapped.data } };
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
}): Promise<ActionResult<{ timesheet: Timesheet; entries: TimesheetEntry[] }>> {
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
	authority: "line_manager" | "department" | "hr" | "payroll";
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
					authority: z.enum(["line_manager", "department", "hr", "payroll"]),
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

export async function returnTimesheetAction(input: {
	correlationId?: string;
	timesheetId: string;
	expectedVersion: number;
	approverNotes?: string | null;
}): Promise<ActionResult<{ timesheet: Timesheet }>> {
	return runOperatorPermissionAction({
		path: "returnTimesheetAction",
		permission: "human-resources.time.timesheet.approve",
		safeMessage: "Could not return timesheet.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					timesheetId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					approverNotes: z.string().trim().max(1000).nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid timesheet return request.",
					parsed.details,
				);
			}
			const result = await returnTimesheet(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { timesheet: mapped.data } };
		},
	});
}

export async function rejectTimesheetAction(input: {
	correlationId?: string;
	timesheetId: string;
	expectedVersion: number;
	rejectionReason: string;
}): Promise<ActionResult<{ timesheet: Timesheet }>> {
	return runOperatorPermissionAction({
		path: "rejectTimesheetAction",
		permission: "human-resources.time.timesheet.approve",
		safeMessage: "Could not reject timesheet.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					timesheetId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					rejectionReason: z.string().trim().min(1).max(500),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid timesheet rejection request.",
					parsed.details,
				);
			}
			const result = await rejectTimesheet(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { timesheet: mapped.data } };
		},
	});
}

export async function reopenTimesheetAction(input: {
	correlationId?: string;
	timesheetId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ timesheet: Timesheet }>> {
	return runOperatorPermissionAction({
		path: "reopenTimesheetAction",
		permission: "human-resources.time.timesheet.reopen",
		safeMessage: "Could not reopen timesheet.",
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
					"Enter a valid timesheet reopen request.",
					parsed.details,
				);
			}
			const result = await reopenTimesheet(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { timesheet: mapped.data } };
		},
	});
}

export async function lockTimesheetAction(input: {
	correlationId?: string;
	timesheetId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ timesheet: Timesheet }>> {
	return runOperatorPermissionAction({
		path: "lockTimesheetAction",
		permission: "human-resources.time.timesheet.lock",
		safeMessage: "Could not lock timesheet.",
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
					"Enter a valid timesheet lock request.",
					parsed.details,
				);
			}
			const result = await lockTimesheet(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { timesheet: mapped.data } };
		},
	});
}

export async function supersedeTimesheetAction(input: {
	correlationId?: string;
	timesheetId: string;
	expectedVersion: number;
	idempotencyKey: string;
}): Promise<ActionResult<{ timesheet: Timesheet }>> {
	return runOperatorPermissionAction({
		path: "supersedeTimesheetAction",
		permission: "human-resources.time.timesheet.approve",
		safeMessage: "Could not supersede timesheet.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					timesheetId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					idempotencyKey: z.string().trim().min(1).max(128),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid timesheet supersede request.",
					parsed.details,
				);
			}
			const result = await supersedeTimesheet(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { timesheet: mapped.data } };
		},
	});
}

export async function importAttendanceEventsAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	batchId: string;
	sourceKey: string;
	cursor?: string;
	events?: Array<{
		employeeId: string;
		employmentId?: string | null;
		shiftAssignmentId?: string | null;
		eventType: "clock_in" | "clock_out" | "break_start" | "break_end";
		occurredAt: string;
		sourceTimezone: string;
		localWorkDate: string;
		sourceReference: string;
		locationKey?: string | null;
		notes?: string | null;
	}>;
}): Promise<ActionResult<{ result: AttendanceImportResult }>> {
	return runOperatorPermissionAction({
		path: "importAttendanceEventsAction",
		permission: "human-resources.time.attendance.manage",
		safeMessage: "Could not import attendance events.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					batchId: z.string().trim().min(1).max(200),
					sourceKey: z
						.string()
						.trim()
						.min(1)
						.max(64)
						.regex(/^[a-zA-Z0-9._-]+$/),
					cursor: z.string().trim().min(1).max(500).optional(),
					events: z
						.array(
							z.object({
								employeeId: z.string().uuid(),
								employmentId: z.string().uuid().nullable().optional(),
								shiftAssignmentId: z.string().uuid().nullable().optional(),
								eventType: z.enum([
									"clock_in",
									"clock_out",
									"break_start",
									"break_end",
								]),
								occurredAt: z.string().datetime({ offset: true }),
								sourceTimezone: z.string().trim().min(1).max(64),
								localWorkDate: isoDateSchema,
								sourceReference: z.string().trim().min(1).max(200),
								locationKey: z.string().trim().min(1).max(128).nullable().optional(),
								notes: z.string().trim().max(500).nullable().optional(),
							}),
						)
						.min(1)
						.max(500)
						.optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid attendance import request.",
					parsed.details,
				);
			}
			const result = await importAttendanceEvents(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { result: mapped.data } };
		},
	});
}

export async function correctAttendanceEventAction(input: {
	correlationId?: string;
	eventId: string;
	expectedVersion: number;
	occurredAt: string;
	adjustmentReason: string;
	evidenceReference?: string | null;
	notes?: string | null;
}): Promise<ActionResult<{ event: AttendanceEvent }>> {
	return runOperatorPermissionAction({
		path: "correctAttendanceEventAction",
		permission: "human-resources.time.attendance.correct",
		safeMessage: "Could not correct attendance event.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					eventId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					occurredAt: z.string().datetime({ offset: true }),
					adjustmentReason: z.string().trim().min(1).max(500),
					evidenceReference: z
						.string()
						.trim()
						.min(1)
						.max(500)
						.nullable()
						.optional(),
					notes: z.string().trim().max(500).nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid attendance correction request.",
					parsed.details,
				);
			}
			const result = await correctAttendanceEvent(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { event: mapped.data } };
		},
	});
}

export async function voidAttendanceEventAction(input: {
	correlationId?: string;
	eventId: string;
	expectedVersion: number;
	voidReason: string;
}): Promise<ActionResult<{ event: AttendanceEvent }>> {
	return runOperatorPermissionAction({
		path: "voidAttendanceEventAction",
		permission: "human-resources.time.attendance.correct",
		safeMessage: "Could not void attendance event.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					eventId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					voidReason: z.string().trim().min(1).max(500),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid attendance void request.",
					parsed.details,
				);
			}
			const result = await voidAttendanceEvent(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { event: mapped.data } };
		},
	});
}

export async function resolveAttendanceSessionAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeId: string;
	localWorkDate: string;
	timezone: string;
	employmentId?: string | null;
	shiftAssignmentId?: string | null;
}): Promise<ActionResult<{ session: AttendanceSession }>> {
	return runOperatorPermissionAction({
		path: "resolveAttendanceSessionAction",
		permission: "human-resources.time.attendance.manage",
		safeMessage: "Could not resolve attendance session.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					employeeId: z.string().uuid(),
					localWorkDate: isoDateSchema,
					timezone: z.string().trim().min(1).max(64),
					employmentId: z.string().uuid().nullable().optional(),
					shiftAssignmentId: z.string().uuid().nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid attendance session resolve request.",
					parsed.details,
				);
			}
			const result = await resolveAttendanceSession(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { session: mapped.data } };
		},
	});
}
