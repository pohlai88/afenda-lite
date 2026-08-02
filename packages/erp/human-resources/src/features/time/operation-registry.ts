import {
	HUMAN_RESOURCES_PERMISSION_TIME_ATTENDANCE_CORRECT,
	HUMAN_RESOURCES_PERMISSION_TIME_ATTENDANCE_READ,
	HUMAN_RESOURCES_PERMISSION_TIME_ATTENDANCE_SELF_RECORD,
	HUMAN_RESOURCES_PERMISSION_TIME_CALENDAR_MANAGE,
	HUMAN_RESOURCES_PERMISSION_TIME_CALENDAR_READ,
	HUMAN_RESOURCES_PERMISSION_TIME_EXCEPTION_READ,
	HUMAN_RESOURCES_PERMISSION_TIME_EXCEPTION_RESOLVE,
	HUMAN_RESOURCES_PERMISSION_TIME_HANDOFF_READ,
	HUMAN_RESOURCES_PERMISSION_TIME_OVERTIME_APPROVE,
	HUMAN_RESOURCES_PERMISSION_TIME_OVERTIME_READ,
	HUMAN_RESOURCES_PERMISSION_TIME_OVERTIME_REQUEST,
	HUMAN_RESOURCES_PERMISSION_TIME_SCHEDULE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_TIME_SCHEDULE_PUBLISH,
	HUMAN_RESOURCES_PERMISSION_TIME_SCHEDULE_READ,
	HUMAN_RESOURCES_PERMISSION_TIME_SHIFT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_TIME_SHIFT_READ,
	HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_APPROVE,
	HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_LOCK,
	HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_READ,
	HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_REOPEN,
	HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_SELF_EDIT,
	HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_SUBMIT,
} from "../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../kernel/operations/define-registry";

const TIME_ATTENDANCE_OWNER = "time-attendance" as const;
const MANIFEST_ONLY_POLICY = "hr.manifest-only" as const;
const TIME_SUBJECT_POLICY = "hr.time" as const;

const CALENDAR_COMMAND = {
	authorizationPolicy: MANIFEST_ONLY_POLICY,
	kind: "command",
	owner: TIME_ATTENDANCE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_CALENDAR_MANAGE,
} as const;

const CALENDAR_QUERY = {
	authorizationPolicy: MANIFEST_ONLY_POLICY,
	kind: "query",
	owner: TIME_ATTENDANCE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_CALENDAR_READ,
} as const;

const EMPLOYMENT_CALENDAR_COMMAND = {
	...CALENDAR_COMMAND,
	authorizationPolicy: TIME_SUBJECT_POLICY,
} as const;

const EMPLOYMENT_CALENDAR_QUERY = {
	...CALENDAR_QUERY,
	authorizationPolicy: TIME_SUBJECT_POLICY,
} as const;

const SHIFT_COMMAND = {
	authorizationPolicy: TIME_SUBJECT_POLICY,
	kind: "command",
	owner: TIME_ATTENDANCE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_SHIFT_MANAGE,
} as const;

const SHIFT_QUERY = {
	authorizationPolicy: TIME_SUBJECT_POLICY,
	kind: "query",
	owner: TIME_ATTENDANCE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_SHIFT_READ,
} as const;

const SCHEDULING_COMMAND = {
	...SHIFT_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_SCHEDULE_MANAGE,
} as const;

const SCHEDULING_PUBLISH_COMMAND = {
	...SHIFT_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_SCHEDULE_PUBLISH,
} as const;

const SCHEDULING_QUERY = {
	...SHIFT_QUERY,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_SCHEDULE_READ,
} as const;

const ATTENDANCE_SELF_RECORD_COMMAND = {
	authorizationPolicy: TIME_SUBJECT_POLICY,
	kind: "command",
	owner: TIME_ATTENDANCE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_ATTENDANCE_SELF_RECORD,
} as const;

const ATTENDANCE_CORRECTION_COMMAND = {
	...ATTENDANCE_SELF_RECORD_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_ATTENDANCE_CORRECT,
} as const;

const ATTENDANCE_QUERY = {
	authorizationPolicy: TIME_SUBJECT_POLICY,
	kind: "query",
	owner: TIME_ATTENDANCE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_ATTENDANCE_READ,
} as const;

const ATTENDANCE_EXCEPTION_COMMAND = {
	...ATTENDANCE_CORRECTION_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_EXCEPTION_RESOLVE,
} as const;

const ATTENDANCE_EXCEPTION_QUERY = {
	...ATTENDANCE_QUERY,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_EXCEPTION_READ,
} as const;

const TIMESHEET_EDIT_COMMAND = {
	authorizationPolicy: TIME_SUBJECT_POLICY,
	kind: "command",
	owner: TIME_ATTENDANCE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_SELF_EDIT,
} as const;

const TIMESHEET_QUERY = {
	authorizationPolicy: TIME_SUBJECT_POLICY,
	kind: "query",
	owner: TIME_ATTENDANCE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_READ,
} as const;

const OVERTIME_REQUEST_COMMAND = {
	authorizationPolicy: TIME_SUBJECT_POLICY,
	kind: "command",
	owner: TIME_ATTENDANCE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_OVERTIME_REQUEST,
} as const;

const OVERTIME_APPROVAL_COMMAND = {
	...OVERTIME_REQUEST_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_OVERTIME_APPROVE,
} as const;

const OVERTIME_QUERY = {
	authorizationPolicy: TIME_SUBJECT_POLICY,
	kind: "query",
	owner: TIME_ATTENDANCE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_TIME_OVERTIME_READ,
} as const;

export const HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createWorkCalendar: {
			...CALENDAR_COMMAND,
			id: "human-resources.work-calendar.create",
			publicName: "createWorkCalendar",
		},
		updateWorkCalendar: {
			...CALENDAR_COMMAND,
			id: "human-resources.work-calendar.update",
			publicName: "updateWorkCalendar",
		},
		supersedeWorkCalendar: {
			...CALENDAR_COMMAND,
			id: "human-resources.work-calendar.supersede",
			publicName: "supersedeWorkCalendar",
		},
		archiveWorkCalendar: {
			...CALENDAR_COMMAND,
			id: "human-resources.work-calendar.archive",
			publicName: "archiveWorkCalendar",
		},
		addWorkCalendarHoliday: {
			...CALENDAR_COMMAND,
			id: "human-resources.work-calendar.holiday.add",
			publicName: "addWorkCalendarHoliday",
		},
		removeWorkCalendarHoliday: {
			...CALENDAR_COMMAND,
			id: "human-resources.work-calendar.holiday.remove",
			publicName: "removeWorkCalendarHoliday",
		},
		addCalendarDateOverride: {
			...CALENDAR_COMMAND,
			id: "human-resources.work-calendar.date-override.add",
			publicName: "addCalendarDateOverride",
		},
		removeCalendarDateOverride: {
			...CALENDAR_COMMAND,
			id: "human-resources.work-calendar.date-override.remove",
			publicName: "removeCalendarDateOverride",
		},
		assignEmploymentCalendar: {
			...EMPLOYMENT_CALENDAR_COMMAND,
			id: "human-resources.employment-calendar.assign",
			publicName: "assignEmploymentCalendar",
		},
		endWorkCalendarAssignment: {
			...EMPLOYMENT_CALENDAR_COMMAND,
			id: "human-resources.employment-calendar.end",
			publicName: "endWorkCalendarAssignment",
		},
		assignWorkCalendarScope: {
			...CALENDAR_COMMAND,
			id: "human-resources.work-calendar.scope.assign",
			publicName: "assignWorkCalendarScope",
		},
		endWorkCalendarScopeAssignment: {
			...CALENDAR_COMMAND,
			id: "human-resources.work-calendar.scope.end",
			publicName: "endWorkCalendarScopeAssignment",
		},
	});

export const HUMAN_RESOURCES_WORK_CALENDAR_QUERIES =
	defineHumanResourcesOperationRegistry({
		getWorkCalendar: {
			...CALENDAR_QUERY,
			id: "human-resources.work-calendar.get",
			publicName: "getWorkCalendar",
		},
		listWorkCalendars: {
			...CALENDAR_QUERY,
			id: "human-resources.work-calendar.list",
			publicName: "listWorkCalendars",
		},
		listWorkCalendarHolidays: {
			...CALENDAR_QUERY,
			id: "human-resources.work-calendar.holiday.list",
			publicName: "listWorkCalendarHolidays",
		},
		resolveEmploymentCalendar: {
			...EMPLOYMENT_CALENDAR_QUERY,
			id: "human-resources.employment-calendar.resolve",
			publicName: "resolveEmploymentCalendar",
		},
		resolveEmployeeWorkCalendar: {
			...EMPLOYMENT_CALENDAR_QUERY,
			id: "human-resources.employee-work-calendar.resolve",
			publicName: "resolveEmployeeWorkCalendar",
		},
	});

export const HUMAN_RESOURCES_TIME_POLICY_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createTimePolicy: {
			...EMPLOYMENT_CALENDAR_COMMAND,
			id: "human-resources.time-policy.create",
			publicName: "createTimePolicy",
		},
		activateTimePolicy: {
			...EMPLOYMENT_CALENDAR_COMMAND,
			id: "human-resources.time-policy.activate",
			publicName: "activateTimePolicy",
		},
		supersedeTimePolicy: {
			...EMPLOYMENT_CALENDAR_COMMAND,
			id: "human-resources.time-policy.supersede",
			publicName: "supersedeTimePolicy",
		},
		assignTimePolicy: {
			...EMPLOYMENT_CALENDAR_COMMAND,
			id: "human-resources.time-policy.assign",
			publicName: "assignTimePolicy",
		},
		assignTimeApprovalAuthority: {
			...EMPLOYMENT_CALENDAR_COMMAND,
			id: "human-resources.time-approval-authority.assign",
			publicName: "assignTimeApprovalAuthority",
		},
		endTimeApprovalAuthorityAssignment: {
			...EMPLOYMENT_CALENDAR_COMMAND,
			id: "human-resources.time-approval-authority.end",
			publicName: "endTimeApprovalAuthorityAssignment",
		},
	});

export const HUMAN_RESOURCES_TIME_POLICY_QUERIES =
	defineHumanResourcesOperationRegistry({
		getTimePolicy: {
			...EMPLOYMENT_CALENDAR_QUERY,
			id: "human-resources.time-policy.get",
			publicName: "getTimePolicy",
		},
		resolveTimePolicy: {
			...EMPLOYMENT_CALENDAR_QUERY,
			id: "human-resources.time-policy.resolve",
			publicName: "resolveTimePolicy",
		},
	});

export const HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createShift: {
			...SHIFT_COMMAND,
			id: "human-resources.shift.create",
			publicName: "createShift",
		},
		updateShift: {
			...SHIFT_COMMAND,
			id: "human-resources.shift.update",
			publicName: "updateShift",
		},
		supersedeShift: {
			...SHIFT_COMMAND,
			id: "human-resources.shift.supersede",
			publicName: "supersedeShift",
		},
		activateShift: {
			...SHIFT_COMMAND,
			id: "human-resources.shift.activate",
			publicName: "activateShift",
		},
		deactivateShift: {
			...SHIFT_COMMAND,
			id: "human-resources.shift.deactivate",
			publicName: "deactivateShift",
		},
		addShiftBreak: {
			...SHIFT_COMMAND,
			id: "human-resources.shift.break.add",
			publicName: "addShiftBreak",
		},
		removeShiftBreak: {
			...SHIFT_COMMAND,
			id: "human-resources.shift.break.remove",
			publicName: "removeShiftBreak",
		},
		assignShift: {
			...SCHEDULING_COMMAND,
			id: "human-resources.shift-assignment.assign",
			publicName: "assignShift",
		},
		publishShiftAssignment: {
			...SCHEDULING_PUBLISH_COMMAND,
			id: "human-resources.shift-assignment.publish",
			publicName: "publishShiftAssignment",
		},
		cancelShiftAssignment: {
			...SCHEDULING_COMMAND,
			id: "human-resources.shift-assignment.cancel",
			publicName: "cancelShiftAssignment",
		},
		changeShiftAssignment: {
			...SCHEDULING_COMMAND,
			id: "human-resources.shift-assignment.change",
			publicName: "changeShiftAssignment",
		},
		completeShiftAssignment: {
			...SCHEDULING_COMMAND,
			id: "human-resources.shift-assignment.complete",
			publicName: "completeShiftAssignment",
		},
	});

export const HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES =
	defineHumanResourcesOperationRegistry({
		getShift: {
			...SHIFT_QUERY,
			id: "human-resources.shift.get",
			publicName: "getShift",
		},
		listShifts: {
			...SHIFT_QUERY,
			id: "human-resources.shift.list",
			publicName: "listShifts",
		},
		listShiftBreaks: {
			...SHIFT_QUERY,
			id: "human-resources.shift.break.list",
			publicName: "listShiftBreaks",
		},
		getShiftAssignment: {
			...SCHEDULING_QUERY,
			id: "human-resources.shift-assignment.get",
			publicName: "getShiftAssignment",
		},
		listShiftAssignmentSegments: {
			...SCHEDULING_QUERY,
			id: "human-resources.shift-assignment.segments.list",
			publicName: "listShiftAssignmentSegments",
		},
		listShiftAssignments: {
			...SCHEDULING_QUERY,
			id: "human-resources.shift-assignment.list",
			publicName: "listShiftAssignments",
		},
		getScheduledShiftForEmployeeDate: {
			...SCHEDULING_QUERY,
			id: "human-resources.shift-assignment.scheduled-for-date",
			publicName: "getScheduledShiftForEmployeeDate",
		},
		listLocationSchedule: {
			...SCHEDULING_QUERY,
			id: "human-resources.shift-assignment.location-schedule.list",
			publicName: "listLocationSchedule",
		},
	});

export const HUMAN_RESOURCES_ATTENDANCE_COMMANDS =
	defineHumanResourcesOperationRegistry({
		recordAttendanceEvent: {
			...ATTENDANCE_SELF_RECORD_COMMAND,
			id: "human-resources.attendance-event.record",
			publicName: "recordAttendanceEvent",
		},
		recordClockIn: {
			...ATTENDANCE_SELF_RECORD_COMMAND,
			id: "human-resources.attendance-event.clock-in",
			publicName: "recordClockIn",
		},
		recordClockOut: {
			...ATTENDANCE_SELF_RECORD_COMMAND,
			id: "human-resources.attendance-event.clock-out",
			publicName: "recordClockOut",
		},
		recordBreakStart: {
			...ATTENDANCE_SELF_RECORD_COMMAND,
			id: "human-resources.attendance-event.break-start",
			publicName: "recordBreakStart",
		},
		recordBreakEnd: {
			...ATTENDANCE_SELF_RECORD_COMMAND,
			id: "human-resources.attendance-event.break-end",
			publicName: "recordBreakEnd",
		},
		recordManualAttendance: {
			...ATTENDANCE_SELF_RECORD_COMMAND,
			id: "human-resources.attendance-event.record-manual",
			publicName: "recordManualAttendance",
		},
		importAttendanceEvents: {
			...ATTENDANCE_CORRECTION_COMMAND,
			id: "human-resources.attendance-events.import",
			publicName: "importAttendanceEvents",
		},
		correctAttendanceEvent: {
			...ATTENDANCE_CORRECTION_COMMAND,
			id: "human-resources.attendance-event.correct",
			publicName: "correctAttendanceEvent",
		},
		voidAttendanceEvent: {
			...ATTENDANCE_CORRECTION_COMMAND,
			id: "human-resources.attendance-event.void",
			publicName: "voidAttendanceEvent",
		},
		resolveAttendanceSession: {
			...ATTENDANCE_CORRECTION_COMMAND,
			id: "human-resources.attendance-session.resolve",
			publicName: "resolveAttendanceSession",
		},
		approveAttendanceBreakWaiver: {
			...ATTENDANCE_CORRECTION_COMMAND,
			id: "human-resources.attendance-break-waiver.approve",
			publicName: "approveAttendanceBreakWaiver",
		},
		createAttendanceException: {
			...ATTENDANCE_EXCEPTION_COMMAND,
			id: "human-resources.attendance-exception.create",
			publicName: "createAttendanceException",
		},
		reviewAttendanceException: {
			...ATTENDANCE_EXCEPTION_COMMAND,
			id: "human-resources.attendance-exception.review",
			publicName: "reviewAttendanceException",
		},
		excuseAttendanceException: {
			...ATTENDANCE_EXCEPTION_COMMAND,
			id: "human-resources.attendance-exception.excuse",
			publicName: "excuseAttendanceException",
		},
		rejectAttendanceException: {
			...ATTENDANCE_EXCEPTION_COMMAND,
			id: "human-resources.attendance-exception.reject",
			publicName: "rejectAttendanceException",
		},
		resolveAttendanceException: {
			...ATTENDANCE_EXCEPTION_COMMAND,
			id: "human-resources.attendance-exception.resolve",
			publicName: "resolveAttendanceException",
		},
	});

export const HUMAN_RESOURCES_ATTENDANCE_QUERIES =
	defineHumanResourcesOperationRegistry({
		getAttendanceEvent: {
			...ATTENDANCE_QUERY,
			id: "human-resources.attendance-event.get",
			publicName: "getAttendanceEvent",
		},
		listAttendanceEvents: {
			...ATTENDANCE_QUERY,
			id: "human-resources.attendance-event.list",
			publicName: "listAttendanceEvents",
		},
		listAttendanceAdjustments: {
			...ATTENDANCE_QUERY,
			id: "human-resources.attendance-adjustment.list",
			publicName: "listAttendanceAdjustments",
		},
		getAttendanceSession: {
			...ATTENDANCE_QUERY,
			id: "human-resources.attendance-session.get",
			publicName: "getAttendanceSession",
		},
		listAttendanceSessions: {
			...ATTENDANCE_QUERY,
			id: "human-resources.attendance-session.list",
			publicName: "listAttendanceSessions",
		},
		listAttendanceBreakWaiverDecisions: {
			...ATTENDANCE_QUERY,
			id: "human-resources.attendance-break-waiver-decision.list",
			publicName: "listAttendanceBreakWaiverDecisions",
		},
		getAttendanceException: {
			...ATTENDANCE_EXCEPTION_QUERY,
			id: "human-resources.attendance-exception.get",
			publicName: "getAttendanceException",
		},
		listAttendanceExceptions: {
			...ATTENDANCE_EXCEPTION_QUERY,
			id: "human-resources.attendance-exception.list",
			publicName: "listAttendanceExceptions",
		},
		listUnresolvedAttendanceExceptions: {
			...ATTENDANCE_EXCEPTION_QUERY,
			id: "human-resources.attendance-exception.list-unresolved",
			publicName: "listUnresolvedAttendanceExceptions",
		},
		getDailyAttendanceSummary: {
			...ATTENDANCE_QUERY,
			id: "human-resources.attendance.daily-summary.get",
			publicName: "getDailyAttendanceSummary",
		},
	});

export const HUMAN_RESOURCES_TIMESHEET_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createTimesheet: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.create",
			publicName: "createTimesheet",
		},
		generateTimesheetEntries: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.generate-entries",
			publicName: "generateTimesheetEntries",
		},
		addTimesheetEntry: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.entry.add",
			publicName: "addTimesheetEntry",
		},
		updateTimesheetEntry: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.entry.update",
			publicName: "updateTimesheetEntry",
		},
		removeTimesheetEntry: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.entry.remove",
			publicName: "removeTimesheetEntry",
		},
		submitTimesheet: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.submit",
			permission: HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_SUBMIT,
			publicName: "submitTimesheet",
		},
		returnTimesheet: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.return",
			permission: HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_APPROVE,
			publicName: "returnTimesheet",
		},
		approveTimesheet: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.approve",
			permission: HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_APPROVE,
			publicName: "approveTimesheet",
		},
		rejectTimesheet: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.reject",
			permission: HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_APPROVE,
			publicName: "rejectTimesheet",
		},
		reopenTimesheet: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.reopen",
			permission: HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_REOPEN,
			publicName: "reopenTimesheet",
		},
		lockTimesheet: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.lock",
			permission: HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_LOCK,
			publicName: "lockTimesheet",
		},
		supersedeTimesheet: {
			...TIMESHEET_EDIT_COMMAND,
			id: "human-resources.timesheet.supersede",
			permission: HUMAN_RESOURCES_PERMISSION_TIME_TIMESHEET_REOPEN,
			publicName: "supersedeTimesheet",
		},
	});

export const HUMAN_RESOURCES_TIMESHEET_QUERIES =
	defineHumanResourcesOperationRegistry({
		getTimesheet: {
			...TIMESHEET_QUERY,
			id: "human-resources.timesheet.get",
			publicName: "getTimesheet",
		},
		getTimesheetForEmployeePeriod: {
			...TIMESHEET_QUERY,
			id: "human-resources.timesheet.for-employee-period.get",
			publicName: "getTimesheetForEmployeePeriod",
		},
		listTimesheets: {
			...TIMESHEET_QUERY,
			id: "human-resources.timesheet.list",
			publicName: "listTimesheets",
		},
		listTimesheetEntries: {
			...TIMESHEET_QUERY,
			id: "human-resources.timesheet.entry.list",
			publicName: "listTimesheetEntries",
		},
		getTimesheetTotals: {
			...TIMESHEET_QUERY,
			id: "human-resources.timesheet.totals.get",
			publicName: "getTimesheetTotals",
		},
		listTimesheetApprovalDecisions: {
			...TIMESHEET_QUERY,
			id: "human-resources.timesheet-approval-decision.list",
			publicName: "listTimesheetApprovalDecisions",
		},
	});

export const HUMAN_RESOURCES_OVERTIME_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createOvertimeRequest: {
			...OVERTIME_REQUEST_COMMAND,
			id: "human-resources.overtime-request.create",
			publicName: "createOvertimeRequest",
		},
		approveOvertimeRequest: {
			...OVERTIME_APPROVAL_COMMAND,
			id: "human-resources.overtime-request.approve",
			publicName: "approveOvertimeRequest",
		},
		rejectOvertimeRequest: {
			...OVERTIME_APPROVAL_COMMAND,
			id: "human-resources.overtime-request.reject",
			publicName: "rejectOvertimeRequest",
		},
		cancelOvertimeRequest: {
			...OVERTIME_REQUEST_COMMAND,
			id: "human-resources.overtime-request.cancel",
			publicName: "cancelOvertimeRequest",
		},
		recordOvertimeActual: {
			...OVERTIME_REQUEST_COMMAND,
			id: "human-resources.overtime-request.record-actual",
			permission: HUMAN_RESOURCES_PERMISSION_TIME_ATTENDANCE_CORRECT,
			publicName: "recordOvertimeActual",
		},
		verifyOvertimeRequest: {
			...OVERTIME_APPROVAL_COMMAND,
			id: "human-resources.overtime-request.verify",
			publicName: "verifyOvertimeRequest",
		},
	});

export const HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERIES =
	defineHumanResourcesOperationRegistry({
		getApprovedTimeHandoff: {
			...OVERTIME_QUERY,
			id: "human-resources.approved-time-handoff.get",
			permission: HUMAN_RESOURCES_PERMISSION_TIME_HANDOFF_READ,
			publicName: "getApprovedTimeHandoff",
		},
		getOvertimeRequest: {
			...OVERTIME_QUERY,
			id: "human-resources.overtime-request.get",
			publicName: "getOvertimeRequest",
		},
		listOvertimeRequests: {
			...OVERTIME_QUERY,
			id: "human-resources.overtime-request.list",
			publicName: "listOvertimeRequests",
		},
		listPendingOvertimeApprovals: {
			...OVERTIME_QUERY,
			id: "human-resources.overtime-request.list-pending-approval",
			permission: HUMAN_RESOURCES_PERMISSION_TIME_OVERTIME_APPROVE,
			publicName: "listPendingOvertimeApprovals",
		},
	});

export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_CREATE =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.createWorkCalendar.id;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_UPDATE =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.updateWorkCalendar.id;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SUPERSEDE =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.supersedeWorkCalendar.id;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_ARCHIVE =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.archiveWorkCalendar.id;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_ADD =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.addWorkCalendarHoliday.id;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_REMOVE =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.removeWorkCalendarHoliday.id;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_ADD =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.addCalendarDateOverride.id;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_REMOVE =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.removeCalendarDateOverride.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_ASSIGN =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.assignEmploymentCalendar.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_END =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.endWorkCalendarAssignment.id;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_ASSIGN =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.assignWorkCalendarScope.id;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_END =
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS.endWorkCalendarScopeAssignment.id;

export const HUMAN_RESOURCES_QUERY_WORK_CALENDAR_GET =
	HUMAN_RESOURCES_WORK_CALENDAR_QUERIES.getWorkCalendar.id;
export const HUMAN_RESOURCES_QUERY_WORK_CALENDAR_LIST =
	HUMAN_RESOURCES_WORK_CALENDAR_QUERIES.listWorkCalendars.id;
export const HUMAN_RESOURCES_QUERY_WORK_CALENDAR_HOLIDAY_LIST =
	HUMAN_RESOURCES_WORK_CALENDAR_QUERIES.listWorkCalendarHolidays.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CALENDAR_RESOLVE =
	HUMAN_RESOURCES_WORK_CALENDAR_QUERIES.resolveEmploymentCalendar.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_WORK_CALENDAR_RESOLVE =
	HUMAN_RESOURCES_WORK_CALENDAR_QUERIES.resolveEmployeeWorkCalendar.id;

export const HUMAN_RESOURCES_COMMAND_TIME_POLICY_CREATE =
	HUMAN_RESOURCES_TIME_POLICY_COMMANDS.createTimePolicy.id;
export const HUMAN_RESOURCES_COMMAND_TIME_POLICY_ACTIVATE =
	HUMAN_RESOURCES_TIME_POLICY_COMMANDS.activateTimePolicy.id;
export const HUMAN_RESOURCES_COMMAND_TIME_POLICY_SUPERSEDE =
	HUMAN_RESOURCES_TIME_POLICY_COMMANDS.supersedeTimePolicy.id;
export const HUMAN_RESOURCES_COMMAND_TIME_POLICY_ASSIGN =
	HUMAN_RESOURCES_TIME_POLICY_COMMANDS.assignTimePolicy.id;
export const HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_ASSIGN =
	HUMAN_RESOURCES_TIME_POLICY_COMMANDS.assignTimeApprovalAuthority.id;
export const HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_END =
	HUMAN_RESOURCES_TIME_POLICY_COMMANDS.endTimeApprovalAuthorityAssignment.id;

export const HUMAN_RESOURCES_QUERY_TIME_POLICY_GET =
	HUMAN_RESOURCES_TIME_POLICY_QUERIES.getTimePolicy.id;
export const HUMAN_RESOURCES_QUERY_TIME_POLICY_RESOLVE =
	HUMAN_RESOURCES_TIME_POLICY_QUERIES.resolveTimePolicy.id;

export const HUMAN_RESOURCES_COMMAND_SHIFT_CREATE =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.createShift.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.updateShift.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_SUPERSEDE =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.supersedeShift.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.activateShift.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.deactivateShift.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.addShiftBreak.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.removeShiftBreak.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.assignShift.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_PUBLISH =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.publishShiftAssignment.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CANCEL =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.cancelShiftAssignment.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CHANGE =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.changeShiftAssignment.id;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_COMPLETE =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS.completeShiftAssignment.id;

export const HUMAN_RESOURCES_QUERY_SHIFT_GET =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES.getShift.id;
export const HUMAN_RESOURCES_QUERY_SHIFT_LIST =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES.listShifts.id;
export const HUMAN_RESOURCES_QUERY_SHIFT_BREAK_LIST =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES.listShiftBreaks.id;
export const HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_GET =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES.getShiftAssignment.id;
export const HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_SEGMENTS_LIST =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES.listShiftAssignmentSegments.id;
export const HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LIST =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES.listShiftAssignments.id;
export const HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_SCHEDULED_FOR_DATE =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES.getScheduledShiftForEmployeeDate.id;
export const HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LOCATION_SCHEDULE_LIST =
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES.listLocationSchedule.id;

export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.recordAttendanceEvent.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_CLOCK_IN =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.recordClockIn.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_CLOCK_OUT =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.recordClockOut.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_START =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.recordBreakStart.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_END =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.recordBreakEnd.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_MANUAL_RECORD =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.recordManualAttendance.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.importAttendanceEvents.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.correctAttendanceEvent.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.voidAttendanceEvent.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.resolveAttendanceSession.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_WAIVER_APPROVE =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.approveAttendanceBreakWaiver.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.createAttendanceException.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.reviewAttendanceException.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.excuseAttendanceException.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.rejectAttendanceException.id;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE =
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS.resolveAttendanceException.id;

export const HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_GET =
	HUMAN_RESOURCES_ATTENDANCE_QUERIES.getAttendanceEvent.id;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_LIST =
	HUMAN_RESOURCES_ATTENDANCE_QUERIES.listAttendanceEvents.id;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_ADJUSTMENT_LIST =
	HUMAN_RESOURCES_ATTENDANCE_QUERIES.listAttendanceAdjustments.id;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_GET =
	HUMAN_RESOURCES_ATTENDANCE_QUERIES.getAttendanceSession.id;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_LIST =
	HUMAN_RESOURCES_ATTENDANCE_QUERIES.listAttendanceSessions.id;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_BREAK_WAIVER_DECISION_LIST =
	HUMAN_RESOURCES_ATTENDANCE_QUERIES.listAttendanceBreakWaiverDecisions.id;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_GET =
	HUMAN_RESOURCES_ATTENDANCE_QUERIES.getAttendanceException.id;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST =
	HUMAN_RESOURCES_ATTENDANCE_QUERIES.listAttendanceExceptions.id;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST_UNRESOLVED =
	HUMAN_RESOURCES_ATTENDANCE_QUERIES.listUnresolvedAttendanceExceptions.id;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_DAILY_SUMMARY_GET =
	HUMAN_RESOURCES_ATTENDANCE_QUERIES.getDailyAttendanceSummary.id;

export const HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.createTimesheet.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.generateTimesheetEntries.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.addTimesheetEntry.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.updateTimesheetEntry.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.removeTimesheetEntry.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.submitTimesheet.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.returnTimesheet.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.approveTimesheet.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.rejectTimesheet.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.reopenTimesheet.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.lockTimesheet.id;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE =
	HUMAN_RESOURCES_TIMESHEET_COMMANDS.supersedeTimesheet.id;

export const HUMAN_RESOURCES_QUERY_TIMESHEET_GET =
	HUMAN_RESOURCES_TIMESHEET_QUERIES.getTimesheet.id;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_FOR_EMPLOYEE_PERIOD_GET =
	HUMAN_RESOURCES_TIMESHEET_QUERIES.getTimesheetForEmployeePeriod.id;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_LIST =
	HUMAN_RESOURCES_TIMESHEET_QUERIES.listTimesheets.id;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_ENTRY_LIST =
	HUMAN_RESOURCES_TIMESHEET_QUERIES.listTimesheetEntries.id;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_TOTALS_GET =
	HUMAN_RESOURCES_TIMESHEET_QUERIES.getTimesheetTotals.id;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_APPROVAL_DECISION_LIST =
	HUMAN_RESOURCES_TIMESHEET_QUERIES.listTimesheetApprovalDecisions.id;

export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE =
	HUMAN_RESOURCES_OVERTIME_COMMANDS.createOvertimeRequest.id;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE =
	HUMAN_RESOURCES_OVERTIME_COMMANDS.approveOvertimeRequest.id;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT =
	HUMAN_RESOURCES_OVERTIME_COMMANDS.rejectOvertimeRequest.id;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL =
	HUMAN_RESOURCES_OVERTIME_COMMANDS.cancelOvertimeRequest.id;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL =
	HUMAN_RESOURCES_OVERTIME_COMMANDS.recordOvertimeActual.id;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY =
	HUMAN_RESOURCES_OVERTIME_COMMANDS.verifyOvertimeRequest.id;

export const HUMAN_RESOURCES_QUERY_APPROVED_TIME_HANDOFF_GET =
	HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERIES.getApprovedTimeHandoff.id;
export const HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_GET =
	HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERIES.getOvertimeRequest.id;
export const HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST =
	HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERIES.listOvertimeRequests.id;
export const HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST_PENDING_APPROVAL =
	HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERIES.listPendingOvertimeApprovals.id;

export const HUMAN_RESOURCES_WORK_CALENDAR_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS);
export const HUMAN_RESOURCES_WORK_CALENDAR_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_WORK_CALENDAR_QUERIES);
export const HUMAN_RESOURCES_TIME_POLICY_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_TIME_POLICY_COMMANDS);
export const HUMAN_RESOURCES_TIME_POLICY_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_TIME_POLICY_QUERIES);
export const HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS);
export const HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES);
export const HUMAN_RESOURCES_ATTENDANCE_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_ATTENDANCE_COMMANDS);
export const HUMAN_RESOURCES_ATTENDANCE_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_ATTENDANCE_QUERIES);
export const HUMAN_RESOURCES_TIMESHEET_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_TIMESHEET_COMMANDS);
export const HUMAN_RESOURCES_TIMESHEET_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_TIMESHEET_QUERIES);
export const HUMAN_RESOURCES_OVERTIME_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_OVERTIME_COMMANDS);
export const HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERIES);
export const HUMAN_RESOURCES_TIME_CAPABILITY_COMMAND_IDS = [
	...HUMAN_RESOURCES_WORK_CALENDAR_COMMAND_IDS,
	...HUMAN_RESOURCES_TIME_POLICY_COMMAND_IDS,
	...HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMAND_IDS,
	...HUMAN_RESOURCES_ATTENDANCE_COMMAND_IDS,
	...HUMAN_RESOURCES_TIMESHEET_COMMAND_IDS,
	...HUMAN_RESOURCES_OVERTIME_COMMAND_IDS,
] as const;
export const HUMAN_RESOURCES_TIME_CAPABILITY_QUERY_IDS = [
	...HUMAN_RESOURCES_WORK_CALENDAR_QUERY_IDS,
	...HUMAN_RESOURCES_TIME_POLICY_QUERY_IDS,
	...HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERY_IDS,
	...HUMAN_RESOURCES_ATTENDANCE_QUERY_IDS,
	...HUMAN_RESOURCES_TIMESHEET_QUERY_IDS,
	...HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERY_IDS,
] as const;

export const HUMAN_RESOURCES_WORK_CALENDAR_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS);
export const HUMAN_RESOURCES_WORK_CALENDAR_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_WORK_CALENDAR_QUERIES);
export const HUMAN_RESOURCES_TIME_POLICY_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_TIME_POLICY_COMMANDS);
export const HUMAN_RESOURCES_TIME_POLICY_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_TIME_POLICY_QUERIES);
export const HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS);
export const HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES);
export const HUMAN_RESOURCES_ATTENDANCE_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_ATTENDANCE_COMMANDS);
export const HUMAN_RESOURCES_ATTENDANCE_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_ATTENDANCE_QUERIES);
export const HUMAN_RESOURCES_TIMESHEET_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_TIMESHEET_COMMANDS);
export const HUMAN_RESOURCES_TIMESHEET_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_TIMESHEET_QUERIES);
export const HUMAN_RESOURCES_OVERTIME_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_OVERTIME_COMMANDS);
export const HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERIES);
