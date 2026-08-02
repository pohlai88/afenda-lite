import type { HumanResourcesCoreStore } from "../workforce-records/employment/store-contract";
import type { HumanResourcesTimeStore } from "./store-contract";

type HumanResourcesWorkCalendarStore = Pick<
	HumanResourcesTimeStore,
	| "addWorkCalendarHoliday"
	| "archiveWorkCalendar"
	| "assignEmploymentCalendar"
	| "assignWorkCalendarScope"
	| "createWorkCalendar"
	| "endEmploymentCalendarAssignment"
	| "endWorkCalendarScopeAssignment"
	| "findWorkCalendarByIdempotencyKey"
	| "getWorkCalendar"
	| "listWorkCalendarHolidays"
	| "listWorkCalendarScopeAssignments"
	| "listWorkCalendars"
	| "removeWorkCalendarHoliday"
	| "resolveEmploymentCalendar"
	| "supersedeWorkCalendar"
	| "updateWorkCalendar"
>;

type HumanResourcesTimePolicyStore = Pick<
	HumanResourcesTimeStore,
	| "activateTimePolicy"
	| "assignTimeApprovalAuthority"
	| "assignTimePolicy"
	| "createTimePolicy"
	| "endTimeApprovalAuthorityAssignment"
	| "findTimePolicyByIdempotencyKey"
	| "getTimePolicy"
	| "resolveTimePolicy"
	| "supersedeTimePolicy"
>;

type HumanResourcesShiftSchedulingStore = Pick<
	HumanResourcesTimeStore,
	| "activateShift"
	| "addShiftBreak"
	| "assignShift"
	| "cancelShiftAssignment"
	| "changeShiftAssignment"
	| "completeShiftAssignment"
	| "createShift"
	| "deactivateShift"
	| "findOverlappingShiftAssignments"
	| "findShiftAssignmentByIdempotencyKey"
	| "findShiftByIdempotencyKey"
	| "getScheduledShiftForEmployeeDate"
	| "getShift"
	| "getShiftAssignment"
	| "listLocationSchedule"
	| "listShiftAssignmentSegments"
	| "listShiftAssignments"
	| "listShiftBreaks"
	| "listShifts"
	| "publishShiftAssignment"
	| "removeShiftBreak"
	| "supersedeShift"
	| "updateShift"
> &
	Pick<
		HumanResourcesCoreStore,
		"findEmploymentByEmployeeAsOf" | "getEmploymentById"
	>;

type HumanResourcesAttendanceStore = Pick<
	HumanResourcesTimeStore,
	| "approveAttendanceBreakWaiver"
	| "correctAttendanceEvent"
	| "createAttendanceException"
	| "excuseAttendanceException"
	| "findAttendanceEventByIdempotencyKey"
	| "findAttendanceSessionByIdempotencyKey"
	| "getAttendanceEvent"
	| "getAttendanceException"
	| "getAttendanceSession"
	| "getDailyAttendanceSummary"
	| "importAttendanceEvents"
	| "listAttendanceAdjustments"
	| "listAttendanceBreakWaiverDecisions"
	| "listAttendanceEvents"
	| "listAttendanceExceptions"
	| "listAttendanceSessions"
	| "listUnresolvedAttendanceExceptions"
	| "recordAttendanceEvent"
	| "rejectAttendanceException"
	| "resolveAttendanceException"
	| "resolveAttendanceSession"
	| "resolveTimeApprovalAuthority"
	| "reviewAttendanceException"
	| "voidAttendanceEvent"
>;

type HumanResourcesTimesheetStore = Pick<
	HumanResourcesTimeStore,
	| "addTimesheetEntry"
	| "approveTimesheet"
	| "createTimesheet"
	| "findTimesheetByIdempotencyKey"
	| "findTimesheetForEmployeePeriod"
	| "generateTimesheetEntries"
	| "getTimesheet"
	| "getTimesheetTotals"
	| "listTimesheetApprovalDecisions"
	| "listTimesheetEntries"
	| "listTimesheets"
	| "lockTimesheet"
	| "rejectTimesheet"
	| "removeTimesheetEntry"
	| "reopenTimesheet"
	| "returnTimesheet"
	| "submitTimesheet"
	| "supersedeTimesheet"
	| "updateTimesheetEntry"
>;

type HumanResourcesOvertimeHandoffStore = Pick<
	HumanResourcesTimeStore,
	| "approveOvertimeRequest"
	| "cancelOvertimeRequest"
	| "createOvertimeRequest"
	| "findOvertimeRequestByIdempotencyKey"
	| "getApprovedTimeHandoff"
	| "getOvertimeRequest"
	| "listOvertimeRequests"
	| "recordOvertimeActual"
	| "rejectOvertimeRequest"
	| "verifyOvertimeRequest"
>;

export type HumanResourcesTimeCapabilityStore =
	HumanResourcesWorkCalendarStore &
		HumanResourcesTimePolicyStore &
		HumanResourcesShiftSchedulingStore &
		HumanResourcesAttendanceStore &
		HumanResourcesTimesheetStore &
		HumanResourcesOvertimeHandoffStore;
