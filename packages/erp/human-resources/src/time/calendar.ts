import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import { resolveAssignmentContext } from "../command-options";
import type { HumanResourcesWorkCalendarId } from "../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_ASSIGN,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_END,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_CREATE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_ADD,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_REMOVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_ADD,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_REMOVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_ASSIGN,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_END,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_UPDATE,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_WORK_CALENDAR_RESOLVE,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CALENDAR_RESOLVE,
	HUMAN_RESOURCES_QUERY_WORK_CALENDAR_GET,
	HUMAN_RESOURCES_QUERY_WORK_CALENDAR_HOLIDAY_LIST,
	HUMAN_RESOURCES_QUERY_WORK_CALENDAR_LIST,
} from "../module-ids";
import {
	addCalendarDateOverrideInputSchema,
	addWorkCalendarHolidayInputSchema,
	archiveWorkCalendarInputSchema,
	assignEmploymentCalendarInputSchema,
	assignWorkCalendarScopeInputSchema,
	createWorkCalendarInputSchema,
	endWorkCalendarAssignmentInputSchema,
	endWorkCalendarScopeAssignmentInputSchema,
	getWorkCalendarInputSchema,
	listWorkCalendarHolidaysInputSchema,
	listWorkCalendarsInputSchema,
	removeCalendarDateOverrideInputSchema,
	removeWorkCalendarHolidayInputSchema,
	resolveEmploymentCalendarInputSchema,
	resolveEmployeeWorkCalendarInputSchema,
	supersedeWorkCalendarInputSchema,
	updateWorkCalendarInputSchema,
} from "../schemas/time";
import { invalidInput } from "../shared/domain-guards";
import { previousIsoDate } from "../shared/effective-dates";
import { runTimeCommand, runTimeQuery } from "../shared/time-command";
import type {
	EmploymentCalendarAssignment,
	WorkCalendar,
	WorkCalendarHolidayRecord,
	WorkCalendarScopeAssignment,
} from "../types";
import { resolveEmployeeWorkCalendar as resolveEmployeeWorkCalendarCore } from "./employee-work-calendar-resolution";

export async function createWorkCalendar(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkCalendar>> {
	return runTimeCommand(input, options, {
		schema: createWorkCalendarInputSchema,
		invalidMessage: "Invalid work calendar create input",
		command: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_CREATE,
		execute: async (data, { store, ports }) => {
			const fingerprint = JSON.stringify({
				code: data.code,
				name: data.name,
				timezone: data.timezone,
				calendarVersion: data.calendarVersion,
				workWeek: data.workWeek,
				standardHoursPerDay: data.standardHoursPerDay,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});
			const existing = await store.findWorkCalendarByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) return existing;
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existing.data.calendar);
			}
			return store.createWorkCalendar(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					timezone: data.timezone,
					calendarVersion: data.calendarVersion,
					workWeek: data.workWeek,
					standardHoursPerDay: data.standardHoursPerDay,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function updateWorkCalendar(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkCalendar>> {
	return runTimeCommand(input, options, {
		schema: updateWorkCalendarInputSchema,
		invalidMessage: "Invalid work calendar update input",
		command: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_UPDATE,
		execute: async (data, { store, ports }) =>
			store.updateWorkCalendar(data, ports),
	});
}

export async function supersedeWorkCalendar(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ superseded: WorkCalendar; successor: WorkCalendar }>> {
	return runTimeCommand(input, options, {
		schema: supersedeWorkCalendarInputSchema,
		invalidMessage: "Invalid work calendar supersede input",
		command: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SUPERSEDE,
		execute: async (data, { store, ports }) => {
			const predecessor = await store.getWorkCalendar({
				organizationId: data.organizationId,
				calendarId: data.calendarId,
			});
			if (!predecessor.ok) return predecessor;
			if (predecessor.data === null) {
				return invalidInput("Work calendar was not found");
			}
			if (predecessor.data.status !== "active") {
				return invalidInput("Only active work calendars can be superseded");
			}
			if (data.effectiveFrom <= predecessor.data.effectiveFrom) {
				return invalidInput(
					"Successor effectiveFrom must be after the predecessor",
				);
			}
			if (
				data.effectiveTo !== undefined &&
				data.effectiveTo !== null &&
				data.effectiveTo < data.effectiveFrom
			) {
				return invalidInput("effectiveTo must be on or after effectiveFrom");
			}
			const values = {
				code: predecessor.data.code,
				name: data.name ?? predecessor.data.name,
				timezone: data.timezone ?? predecessor.data.timezone,
				calendarVersion: data.calendarVersion,
				workWeek: data.workWeek ?? predecessor.data.workWeek,
				standardHoursPerDay:
					data.standardHoursPerDay ?? predecessor.data.standardHoursPerDay,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			};
			const fingerprint = JSON.stringify({
				calendarId: data.calendarId,
				expectedVersion: data.expectedVersion,
				...values,
			});
			const replay = await store.findWorkCalendarByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!replay.ok) return replay;
			if (replay.data !== null) {
				if (replay.data.createRequestFingerprint !== fingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				if (replay.data.calendar.supersedesCalendarId !== data.calendarId) {
					return invalidInput("Stored successor has no matching predecessor");
				}
				const superseded = await store.getWorkCalendar({
					organizationId: data.organizationId,
					calendarId: data.calendarId,
				});
				if (!superseded.ok) return superseded;
				if (superseded.data === null) {
					return invalidInput("Stored predecessor was not found");
				}
				return ok({
					superseded: superseded.data,
					successor: replay.data.calendar,
				});
			}
			return store.supersedeWorkCalendar(
				{
					organizationId: data.organizationId,
					calendarId: data.calendarId,
					expectedVersion: data.expectedVersion,
					predecessorEffectiveTo: previousIsoDate(data.effectiveFrom),
					...values,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function archiveWorkCalendar(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkCalendar>> {
	return runTimeCommand(input, options, {
		schema: archiveWorkCalendarInputSchema,
		invalidMessage: "Invalid work calendar archive input",
		command: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_ARCHIVE,
		execute: async (data, { store, ports }) =>
			store.archiveWorkCalendar(data, ports),
	});
}

export async function getWorkCalendar(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkCalendar | null>> {
	return runTimeQuery(input, options, {
		schema: getWorkCalendarInputSchema,
		invalidMessage: "Invalid work calendar get input",
		query: HUMAN_RESOURCES_QUERY_WORK_CALENDAR_GET,
		execute: async (data, { store }) =>
			store.getWorkCalendar({
				organizationId: data.organizationId,
				calendarId: data.calendarId,
			}),
	});
}

export async function listWorkCalendars(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkCalendar[]>> {
	return runTimeQuery(input, options, {
		schema: listWorkCalendarsInputSchema,
		invalidMessage: "Invalid work calendar list input",
		query: HUMAN_RESOURCES_QUERY_WORK_CALENDAR_LIST,
		execute: async (data, { store }) => store.listWorkCalendars(data),
	});
}

export async function addWorkCalendarHoliday(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkCalendarHolidayRecord>> {
	return runTimeCommand(input, options, {
		schema: addWorkCalendarHolidayInputSchema,
		invalidMessage: "Invalid work calendar holiday add input",
		command: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_ADD,
		execute: async (data, { store, ports }) =>
			store.addWorkCalendarHoliday(
				{
					organizationId: data.organizationId,
					calendarId: data.calendarId,
					holidayDate: data.holidayDate,
					label: data.label ?? null,
					locationCode: data.locationCode ?? null,
					jurisdiction: data.jurisdiction ?? null,
					overrideKind: data.overrideKind,
					isWorkingDay: data.isWorkingDay,
					expectedMinutes: data.expectedMinutes,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function removeWorkCalendarHoliday(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<void>> {
	return runTimeCommand(input, options, {
		schema: removeWorkCalendarHolidayInputSchema,
		invalidMessage: "Invalid work calendar holiday remove input",
		command: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_REMOVE,
		execute: async (data, { store, ports }) =>
			store.removeWorkCalendarHoliday(
				{
					organizationId: data.organizationId,
					holidayId: data.holidayId,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function addCalendarDateOverride(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkCalendarHolidayRecord>> {
	return runTimeCommand(input, options, {
		schema: addCalendarDateOverrideInputSchema,
		invalidMessage: "Invalid work calendar date override add input",
		command: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_ADD,
		execute: async (data, { store, ports }) =>
			store.addWorkCalendarHoliday(
				{
					organizationId: data.organizationId,
					calendarId: data.calendarId,
					holidayDate: data.holidayDate,
					label: data.label ?? null,
					locationCode: data.locationCode ?? null,
					jurisdiction: data.jurisdiction ?? null,
					overrideKind: data.overrideKind,
					isWorkingDay: data.isWorkingDay,
					expectedMinutes: data.expectedMinutes,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function removeCalendarDateOverride(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<void>> {
	return runTimeCommand(input, options, {
		schema: removeCalendarDateOverrideInputSchema,
		invalidMessage: "Invalid work calendar date override remove input",
		command: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_REMOVE,
		execute: async (data, { store, ports }) =>
			store.removeWorkCalendarHoliday(
				{
					organizationId: data.organizationId,
					holidayId: data.holidayId,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function listWorkCalendarHolidays(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkCalendarHolidayRecord[]>> {
	return runTimeQuery(input, options, {
		schema: listWorkCalendarHolidaysInputSchema,
		invalidMessage: "Invalid work calendar holiday list input",
		query: HUMAN_RESOURCES_QUERY_WORK_CALENDAR_HOLIDAY_LIST,
		execute: async (data, { store }) => store.listWorkCalendarHolidays(data),
	});
}

export async function assignEmploymentCalendar(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentCalendarAssignment>> {
	return runTimeCommand(input, options, {
		schema: assignEmploymentCalendarInputSchema,
		invalidMessage: "Invalid employment calendar assign input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_ASSIGN,
		execute: async (data, { store, ports }) =>
			store.assignEmploymentCalendar(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					calendarId: data.calendarId,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					locationCode: data.locationCode ?? null,
					jurisdiction: data.jurisdiction ?? null,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function endWorkCalendarAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentCalendarAssignment>> {
	return runTimeCommand(input, options, {
		schema: endWorkCalendarAssignmentInputSchema,
		invalidMessage: "Invalid employment calendar end input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_END,
		execute: async (data, { store, ports }) =>
			store.endEmploymentCalendarAssignment(
				{
					organizationId: data.organizationId,
					assignmentId: data.assignmentId,
					effectiveTo: data.effectiveTo,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function resolveEmploymentCalendar(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentCalendarAssignment | null>> {
	return runTimeQuery(input, options, {
		schema: resolveEmploymentCalendarInputSchema,
		invalidMessage: "Invalid employment calendar resolve input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_CALENDAR_RESOLVE,
		execute: async (data, { store }) => store.resolveEmploymentCalendar(data),
	});
}

export async function assignWorkCalendarScope(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkCalendarScopeAssignment>> {
	return runTimeCommand(input, options, {
		schema: assignWorkCalendarScopeInputSchema,
		invalidMessage: "Invalid work calendar scope assign input",
		command: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_ASSIGN,
		execute: async (data, { store, ports }) =>
			store.assignWorkCalendarScope(
				{
					organizationId: data.organizationId,
					scopeType: data.scopeType,
					scopeKey: data.scopeKey,
					calendarId: data.calendarId,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function endWorkCalendarScopeAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkCalendarScopeAssignment>> {
	return runTimeCommand(input, options, {
		schema: endWorkCalendarScopeAssignmentInputSchema,
		invalidMessage: "Invalid work calendar scope end input",
		command: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_END,
		execute: async (data, { store, ports }) =>
			store.endWorkCalendarScopeAssignment(
				{
					organizationId: data.organizationId,
					assignmentId: data.assignmentId,
					effectiveTo: data.effectiveTo,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function resolveEmployeeWorkCalendar(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ calendarId: HumanResourcesWorkCalendarId }>> {
	return runTimeQuery(input, options, {
		schema: resolveEmployeeWorkCalendarInputSchema,
		invalidMessage: "Invalid employee work calendar resolve input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_WORK_CALENDAR_RESOLVE,
		execute: async (data, { store }) =>
			resolveEmployeeWorkCalendarCore(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					asOf: data.asOf,
				},
				{
					store,
					assignmentContext: resolveAssignmentContext(options),
				},
			),
	});
}
