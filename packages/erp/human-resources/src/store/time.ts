import type { Result } from "@afenda/errors/result";

import type {
	HumanResourcesAttendanceEventId,
	HumanResourcesAttendanceExceptionId,
	HumanResourcesAttendanceSessionId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentCalendarAssignmentId,
	HumanResourcesEmploymentId,
	HumanResourcesOvertimeRequestId,
	HumanResourcesShiftAssignmentId,
	HumanResourcesShiftBreakId,
	HumanResourcesShiftId,
	HumanResourcesTimeApprovalAuthorityAssignmentId,
	HumanResourcesTimePolicyId,
	HumanResourcesTimesheetEntryId,
	HumanResourcesTimesheetId,
	HumanResourcesWorkCalendarHolidayId,
	HumanResourcesWorkCalendarId,
	HumanResourcesWorkCalendarScopeAssignmentId,
} from "../brands";
import type { ApprovedLeaveQueryPort, MutationPorts } from "../ports";
import type { WorkCalendarPort } from "../time/work-calendar";
import type {
	ApprovedTimeHandoff,
	AttendanceAdjustment,
	AttendanceBreakWaiverDecision,
	AttendanceEvent,
	AttendanceEventRecordInput,
	AttendanceEventSource,
	AttendanceEventType,
	AttendanceException,
	AttendanceExceptionType,
	AttendanceImportBatchInput,
	AttendanceImportRejectedRow,
	AttendanceImportResult,
	AttendanceSession,
	AttendanceSessionResolveInput,
	DailyAttendanceSummary,
	EmploymentCalendarAssignment,
	IdempotentAttendanceEventRecord,
	IdempotentAttendanceImportBatchRecord,
	IdempotentAttendanceSessionRecord,
	IdempotentOvertimeRequestRecord,
	IdempotentShiftAssignmentRecord,
	IdempotentShiftRecord,
	IdempotentTimesheetRecord,
	IdempotentWorkCalendarRecord,
	OvertimeRequest,
	OvertimeType,
	Shift,
	ShiftAssignment,
	ShiftAssignmentSegment,
	ShiftBreak,
	ShiftCreateRecord,
	ShiftKind,
	TimeApprovalAuthority,
	TimeApprovalAuthorityAssignment,
	TimePolicy,
	TimePolicyAssignment,
	Timesheet,
	TimesheetApprovalDecision,
	TimesheetCreateRecord,
	TimesheetEntry,
	TimesheetEntrySourceType,
	TimesheetEntryTimeType,
	TimesheetStatus,
	TimesheetTotals,
	WorkCalendar,
	WorkCalendarDateOverrideKind,
	WorkCalendarHolidayRecord,
	WorkCalendarScopeAssignment,
	WorkWeekDayPatternJson,
} from "../types";

/**
 * Persistence contract for Time Management.
 *
 * Domain slice of `HumanResourcesStore`. Persistence behavior lives here;
 * orchestration belongs in application commands.
 */

export interface TimesheetGenerationDeps {
	approvedLeave: ApprovedLeaveQueryPort;
	workCalendar: WorkCalendarPort;
}

export type AttendanceImportStoreInput = AttendanceImportBatchInput & {
	sourceRejectedRows?: readonly AttendanceImportRejectedRow[] | undefined;
	sourceRowIndexes?: readonly number[] | undefined;
};

export interface TimePolicyCreateRecord {
	approvalSteps: readonly TimeApprovalAuthority[];
	automaticBreakAfterMinutes: number | null;
	automaticBreakMinutes: number;
	code: string;
	correlationId: string;
	createdBy: string;
	createRequestFingerprint: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	idempotencyKey: string;
	minimumRestMinutes: number;
	name: string;
	organizationId: string;
}

export type {
	AttendanceEventRecordInput,
	AttendanceImportBatchInput,
	AttendanceImportResult,
	AttendanceSessionResolveInput,
	IdempotentAttendanceEventRecord,
	IdempotentAttendanceImportBatchRecord,
	IdempotentAttendanceSessionRecord,
	IdempotentOvertimeRequestRecord,
	IdempotentShiftAssignmentRecord,
	IdempotentShiftRecord,
	IdempotentTimesheetRecord,
	IdempotentWorkCalendarRecord,
	ShiftCreateRecord,
	TimesheetCreateRecord,
} from "../types";

export interface WorkCalendarCreateRecord {
	calendarVersion: string;
	code: string;
	correlationId: string;
	createdBy: string;
	createRequestFingerprint: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	idempotencyKey: string;
	name: string;
	organizationId: string;
	standardHoursPerDay: string;
	timezone: string;
	workWeek: readonly WorkWeekDayPatternJson[];
}

export interface WorkCalendarHolidayCreateRecord {
	calendarId: HumanResourcesWorkCalendarId;
	correlationId: string;
	createdBy: string;
	expectedMinutes: number | null;
	holidayDate: string;
	isWorkingDay: boolean;
	jurisdiction: string | null;
	label: string | null;
	locationCode: string | null;
	organizationId: string;
	overrideKind: WorkCalendarDateOverrideKind;
}

export interface EmploymentCalendarAssignRecord {
	calendarId: HumanResourcesWorkCalendarId;
	correlationId: string;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	jurisdiction: string | null;
	locationCode: string | null;
	organizationId: string;
}

export interface WorkCalendarScopeAssignRecord {
	calendarId: HumanResourcesWorkCalendarId;
	correlationId: string;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	organizationId: string;
	scopeKey: string;
	scopeType: import("../types").WorkCalendarScopeType;
}

export interface ShiftBreakCreateRecord {
	breakOrder: number;
	correlationId: string;
	durationMinutes: number;
	isPaid: boolean;
	label: string | null;
	organizationId: string;
	shiftId: HumanResourcesShiftId;
	startOffsetMinutes: number | null;
}

export interface ShiftAssignmentCreateRecord {
	assignmentSource: string;
	correlationId: string;
	createdBy: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	endsAt: Date;
	idempotencyKey: string;
	locationKey: string | null;
	organizationId: string;
	scheduledDate: string;
	segments: readonly {
		segmentOrder: number;
		startsAt: Date;
		endsAt: Date;
	}[];
	shiftId: HumanResourcesShiftId;
	startsAt: Date;
	timezone: string;
}

export interface AttendanceExceptionCreateRecord {
	correlationId: string;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	eventId: HumanResourcesAttendanceEventId | null;
	exceptionType: AttendanceExceptionType;
	organizationId: string;
	remarks: string | null;
	sessionId: HumanResourcesAttendanceSessionId | null;
	severity: "info" | "warning" | "critical";
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
}

export interface TimesheetEntryCreateRecord {
	approvalReference: string | null;
	approvedMinutes: number;
	correlationId: string;
	costCenterId: string | null;
	createdBy: string;
	departmentId: string | null;
	employeeId: HumanResourcesEmployeeId;
	endedAt: Date | null;
	evidenceReference: string | null;
	locationId: string | null;
	organizationId: string;
	projectId: string | null;
	recordedMinutes: number;
	sourceReference: string | null;
	sourceType: TimesheetEntrySourceType;
	startedAt: Date | null;
	timesheetId: HumanResourcesTimesheetId;
	timeType: TimesheetEntryTimeType;
	timezone: string;
	workDate: string;
}

export interface OvertimeRequestCreateRecord {
	correlationId: string;
	createdBy: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	evidenceReference: string | null;
	idempotencyKey: string;
	organizationId: string;
	overtimeType: OvertimeType;
	reason: string;
	requestedEndsAt: Date;
	requestedMinutes: number;
	requestedStartsAt: Date;
}

export interface HumanResourcesTimeStore {
	activateShift: (
		input: {
			organizationId: string;
			shiftId: HumanResourcesShiftId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<Shift>>;

	activateTimePolicy: (
		input: {
			organizationId: string;
			policyId: HumanResourcesTimePolicyId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<TimePolicy>>;

	addShiftBreak: (
		input: ShiftBreakCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<ShiftBreak>>;

	addTimesheetEntry: (
		input: TimesheetEntryCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<TimesheetEntry>>;

	addWorkCalendarHoliday: (
		input: WorkCalendarHolidayCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<WorkCalendarHolidayRecord>>;

	approveAttendanceBreakWaiver: (
		input: {
			organizationId: string;
			sessionId: HumanResourcesAttendanceSessionId;
			policyId: HumanResourcesTimePolicyId;
			authorityAssignmentId: HumanResourcesTimeApprovalAuthorityAssignmentId;
			authority: TimeApprovalAuthority;
			reason: string;
			evidenceReference: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<AttendanceBreakWaiverDecision>>;

	approveOvertimeRequest: (
		input: {
			organizationId: string;
			requestId: HumanResourcesOvertimeRequestId;
			authority: TimeApprovalAuthority;
			approvedMaximumMinutes: number;
			comment?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<OvertimeRequest>>;

	approveTimesheet: (
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			approverNotes?: string | null | undefined;
			authority: TimeApprovalAuthority;
			authorityAssignmentId: HumanResourcesTimeApprovalAuthorityAssignmentId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<Timesheet>>;

	archiveWorkCalendar: (
		input: {
			organizationId: string;
			calendarId: HumanResourcesWorkCalendarId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<WorkCalendar>>;

	assignEmploymentCalendar: (
		input: EmploymentCalendarAssignRecord,
		ports: MutationPorts,
	) => Promise<Result<EmploymentCalendarAssignment>>;

	assignShift: (
		input: ShiftAssignmentCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<ShiftAssignment>>;

	assignTimeApprovalAuthority: (
		input: {
			organizationId: string;
			targetActorUserId: string;
			authority: TimeApprovalAuthority;
			effectiveFrom: string;
			effectiveTo: string | null;
			createdBy: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<TimeApprovalAuthorityAssignment>>;

	assignTimePolicy: (
		input: {
			organizationId: string;
			policyId: HumanResourcesTimePolicyId;
			employmentId: HumanResourcesEmploymentId;
			effectiveFrom: string;
			effectiveTo: string | null;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<TimePolicyAssignment>>;

	assignWorkCalendarScope: (
		input: WorkCalendarScopeAssignRecord,
		ports: MutationPorts,
	) => Promise<Result<WorkCalendarScopeAssignment>>;

	cancelOvertimeRequest: (
		input: {
			organizationId: string;
			requestId: HumanResourcesOvertimeRequestId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<OvertimeRequest>>;

	cancelShiftAssignment: (
		input: {
			organizationId: string;
			assignmentId: HumanResourcesShiftAssignmentId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<ShiftAssignment>>;

	changeShiftAssignment: (
		input: {
			organizationId: string;
			assignmentId: HumanResourcesShiftAssignmentId;
			shiftId?: HumanResourcesShiftId | undefined;
			scheduledDate?: string | undefined;
			startsAt?: Date | undefined;
			endsAt?: Date | undefined;
			locationKey?: string | null | undefined;
			timezone?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<ShiftAssignment>>;

	completeShiftAssignment: (
		input: {
			organizationId: string;
			assignmentId: HumanResourcesShiftAssignmentId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<ShiftAssignment>>;

	correctAttendanceEvent: (
		input: {
			organizationId: string;
			eventId: HumanResourcesAttendanceEventId;
			occurredAt: Date;
			notes?: string | null | undefined;
			adjustmentReason: string;
			evidenceReference?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<AttendanceEvent>>;

	// Attendance exceptions
	createAttendanceException: (
		input: AttendanceExceptionCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<AttendanceException>>;

	createOvertimeRequest: (
		input: OvertimeRequestCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<OvertimeRequest>>;

	createShift: (
		input: ShiftCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<Shift>>;

	createTimePolicy: (
		input: TimePolicyCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<TimePolicy>>;

	createTimesheet: (
		input: TimesheetCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<Timesheet>>;

	createWorkCalendar: (
		input: WorkCalendarCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<WorkCalendar>>;

	deactivateShift: (
		input: {
			organizationId: string;
			shiftId: HumanResourcesShiftId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<Shift>>;

	endEmploymentCalendarAssignment: (
		input: {
			organizationId: string;
			assignmentId: HumanResourcesEmploymentCalendarAssignmentId;
			effectiveTo: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<EmploymentCalendarAssignment>>;

	endTimeApprovalAuthorityAssignment: (
		input: {
			organizationId: string;
			assignmentId: HumanResourcesTimeApprovalAuthorityAssignmentId;
			effectiveTo: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<TimeApprovalAuthorityAssignment>>;

	endWorkCalendarScopeAssignment: (
		input: {
			organizationId: string;
			assignmentId: HumanResourcesWorkCalendarScopeAssignmentId;
			effectiveTo: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<WorkCalendarScopeAssignment>>;

	excuseAttendanceException: (
		input: {
			organizationId: string;
			exceptionId: HumanResourcesAttendanceExceptionId;
			resolution: string;
			evidenceReference?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<AttendanceException>>;

	// Attendance events
	findAttendanceEventByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentAttendanceEventRecord | null>>;

	findAttendanceEventBySourceReference: (input: {
		organizationId: string;
		source: AttendanceEventSource;
		sourceReference: string;
	}) => Promise<Result<IdempotentAttendanceEventRecord | null>>;

	findAttendanceImportBatchByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentAttendanceImportBatchRecord | null>>;

	// Attendance sessions
	findAttendanceSessionByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentAttendanceSessionRecord | null>>;

	findOverlappingShiftAssignments: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		startsAt: Date;
		endsAt: Date;
		excludeAssignmentId?: HumanResourcesShiftAssignmentId | undefined;
	}) => Promise<Result<ShiftAssignment[]>>;

	// Overtime
	findOvertimeRequestByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentOvertimeRequestRecord | null>>;

	// Shift assignment / scheduling
	findShiftAssignmentByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentShiftAssignmentRecord | null>>;

	// Shift definition
	findShiftByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentShiftRecord | null>>;

	findTimePolicyByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<
		Result<{
			policy: TimePolicy;
			createRequestFingerprint: string;
		} | null>
	>;

	// Timesheet
	findTimesheetByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentTimesheetRecord | null>>;

	findTimesheetForEmployeePeriod: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		periodStart: string;
		periodEnd: string;
	}) => Promise<Result<Timesheet | null>>;
	// Work calendar
	findWorkCalendarByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentWorkCalendarRecord | null>>;

	generateTimesheetEntries: (
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
		deps: TimesheetGenerationDeps,
	) => Promise<Result<{ timesheet: Timesheet; entries: TimesheetEntry[] }>>;

	getApprovedTimeHandoff: (input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
	}) => Promise<Result<ApprovedTimeHandoff | null>>;

	getAttendanceEvent: (input: {
		organizationId: string;
		eventId: HumanResourcesAttendanceEventId;
	}) => Promise<Result<AttendanceEvent | null>>;

	getAttendanceException: (input: {
		organizationId: string;
		exceptionId: HumanResourcesAttendanceExceptionId;
	}) => Promise<Result<AttendanceException | null>>;

	getAttendanceSession: (input: {
		organizationId: string;
		sessionId: HumanResourcesAttendanceSessionId;
	}) => Promise<Result<AttendanceSession | null>>;

	getDailyAttendanceSummary: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		localWorkDate: string;
		timezone: string;
	}) => Promise<Result<DailyAttendanceSummary>>;

	getOvertimeRequest: (input: {
		organizationId: string;
		requestId: HumanResourcesOvertimeRequestId;
	}) => Promise<Result<OvertimeRequest | null>>;

	getPreviousCompletedAttendanceSession: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		before: Date;
		excludeSessionId: HumanResourcesAttendanceSessionId;
	}) => Promise<Result<AttendanceSession | null>>;

	getScheduledShiftForEmployeeDate: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		scheduledDate: string;
	}) => Promise<Result<ShiftAssignment | null>>;

	getShift: (input: {
		organizationId: string;
		shiftId: HumanResourcesShiftId;
	}) => Promise<Result<Shift | null>>;

	getShiftAssignment: (input: {
		organizationId: string;
		assignmentId: HumanResourcesShiftAssignmentId;
	}) => Promise<Result<ShiftAssignment | null>>;

	getTimePolicy: (input: {
		organizationId: string;
		policyId: HumanResourcesTimePolicyId;
	}) => Promise<Result<TimePolicy | null>>;

	getTimesheet: (input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
	}) => Promise<Result<Timesheet | null>>;

	getTimesheetTotals: (input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
	}) => Promise<Result<TimesheetTotals | null>>;

	getWorkCalendar: (input: {
		organizationId: string;
		calendarId: HumanResourcesWorkCalendarId;
	}) => Promise<Result<WorkCalendar | null>>;

	importAttendanceEvents: (
		input: AttendanceImportStoreInput,
		ports: MutationPorts,
	) => Promise<Result<AttendanceImportResult>>;

	listAttendanceAdjustments: (input: {
		organizationId: string;
		eventId: HumanResourcesAttendanceEventId;
	}) => Promise<Result<AttendanceAdjustment[]>>;

	listAttendanceBreakWaiverDecisions: (input: {
		organizationId: string;
		sessionId: HumanResourcesAttendanceSessionId;
	}) => Promise<Result<AttendanceBreakWaiverDecision[]>>;

	listAttendanceEvents: (input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId | undefined;
		fromDate?: string | undefined;
		toDate?: string | undefined;
		eventType?: AttendanceEventType | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	}) => Promise<Result<AttendanceEvent[]>>;

	listAttendanceExceptions: (input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId | undefined;
		reviewStatus?: AttendanceException["reviewStatus"] | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	}) => Promise<Result<AttendanceException[]>>;

	listAttendanceSessions: (input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId | undefined;
		fromDate?: string | undefined;
		toDate?: string | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	}) => Promise<Result<AttendanceSession[]>>;

	listLocationSchedule: (input: {
		organizationId: string;
		locationKey: string;
		fromDate?: string | undefined;
		toDate?: string | undefined;
		publicationStatus?: ShiftAssignment["publicationStatus"] | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	}) => Promise<Result<ShiftAssignment[]>>;

	listOvertimeRequests: (input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId | undefined;
		status?: OvertimeRequest["status"] | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	}) => Promise<Result<OvertimeRequest[]>>;

	listShiftAssignmentSegments: (input: {
		organizationId: string;
		assignmentId: HumanResourcesShiftAssignmentId;
	}) => Promise<Result<ShiftAssignmentSegment[]>>;

	listShiftAssignments: (input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId | undefined;
		fromDate?: string | undefined;
		toDate?: string | undefined;
		scheduledDate?: string | undefined;
		locationKey?: string | undefined;
		publicationStatus?: ShiftAssignment["publicationStatus"] | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	}) => Promise<Result<ShiftAssignment[]>>;

	listShiftBreaks: (input: {
		organizationId: string;
		shiftId: HumanResourcesShiftId;
	}) => Promise<Result<ShiftBreak[]>>;

	listShifts: (input: {
		organizationId: string;
		status?: "draft" | "active" | "superseded" | "inactive" | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	}) => Promise<Result<Shift[]>>;

	listTimesheetApprovalDecisions: (input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
		submissionReference?: string | undefined;
	}) => Promise<Result<TimesheetApprovalDecision[]>>;

	listTimesheetEntries: (input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
	}) => Promise<Result<TimesheetEntry[]>>;

	listTimesheets: (input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId | undefined;
		status?: TimesheetStatus | undefined;
		periodStart?: string | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	}) => Promise<Result<Timesheet[]>>;

	listUnresolvedAttendanceExceptions: (input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	}) => Promise<Result<AttendanceException[]>>;

	listWorkCalendarHolidays: (input: {
		organizationId: string;
		calendarId: HumanResourcesWorkCalendarId;
		fromDate?: string | undefined;
		toDate?: string | undefined;
	}) => Promise<Result<WorkCalendarHolidayRecord[]>>;

	listWorkCalendarScopeAssignments: (input: {
		organizationId: string;
		asOf: string;
	}) => Promise<Result<WorkCalendarScopeAssignment[]>>;

	listWorkCalendars: (input: {
		organizationId: string;
		status?: "active" | "superseded" | "archived" | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	}) => Promise<Result<WorkCalendar[]>>;

	lockTimesheet: (
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<Timesheet>>;

	publishShiftAssignment: (
		input: {
			organizationId: string;
			assignmentId: HumanResourcesShiftAssignmentId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<ShiftAssignment>>;

	recordAttendanceEvent: (
		input: AttendanceEventRecordInput,
		ports: MutationPorts,
	) => Promise<Result<AttendanceEvent>>;

	recordOvertimeActual: (
		input: {
			organizationId: string;
			requestId: HumanResourcesOvertimeRequestId;
			actualMinutes: number;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<OvertimeRequest>>;

	rejectAttendanceException: (
		input: {
			organizationId: string;
			exceptionId: HumanResourcesAttendanceExceptionId;
			resolution: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<AttendanceException>>;

	rejectOvertimeRequest: (
		input: {
			organizationId: string;
			requestId: HumanResourcesOvertimeRequestId;
			comment: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<OvertimeRequest>>;

	rejectTimesheet: (
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			rejectionReason: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<Timesheet>>;

	removeShiftBreak: (
		input: {
			organizationId: string;
			breakId: HumanResourcesShiftBreakId;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<void>>;

	removeTimesheetEntry: (
		input: {
			organizationId: string;
			entryId: HumanResourcesTimesheetEntryId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<void>>;

	removeWorkCalendarHoliday: (
		input: {
			organizationId: string;
			holidayId: HumanResourcesWorkCalendarHolidayId;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<void>>;

	reopenTimesheet: (
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<Timesheet>>;

	resolveAttendanceException: (
		input: {
			organizationId: string;
			exceptionId: HumanResourcesAttendanceExceptionId;
			resolution: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<AttendanceException>>;

	resolveAttendanceSession: (
		input: AttendanceSessionResolveInput,
		ports: MutationPorts,
	) => Promise<Result<AttendanceSession>>;

	resolveEmploymentCalendar: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}) => Promise<Result<EmploymentCalendarAssignment | null>>;

	resolveTimeApprovalAuthority: (input: {
		organizationId: string;
		actorUserId: string;
		authority: TimeApprovalAuthority;
		asOf: string;
	}) => Promise<Result<TimeApprovalAuthorityAssignment | null>>;

	resolveTimePolicy: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}) => Promise<Result<TimePolicy | null>>;

	returnTimesheet: (
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			approverNotes?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<Timesheet>>;

	reviewAttendanceException: (
		input: {
			organizationId: string;
			exceptionId: HumanResourcesAttendanceExceptionId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<AttendanceException>>;

	submitTimesheet: (
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			submissionReference: string;
			approvalPolicyId: HumanResourcesTimePolicyId | null;
			requiredApprovalSteps: readonly TimeApprovalAuthority[];
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<Timesheet>>;

	supersedeShift: (
		input: ShiftCreateRecord & {
			shiftId: HumanResourcesShiftId;
			expectedVersion: number;
			predecessorEffectiveTo: string;
		},
		ports: MutationPorts,
	) => Promise<Result<{ superseded: Shift; successor: Shift }>>;

	supersedeTimePolicy: (
		input: TimePolicyCreateRecord & {
			policyId: HumanResourcesTimePolicyId;
			expectedVersion: number;
			predecessorEffectiveTo: string;
		},
		ports: MutationPorts,
	) => Promise<Result<{ superseded: TimePolicy; successor: TimePolicy }>>;

	supersedeTimesheet: (
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			expectedVersion: number;
			actorUserId: string;
			idempotencyKey: string;
			createRequestFingerprint: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<Timesheet>>;

	supersedeWorkCalendar: (
		input: WorkCalendarCreateRecord & {
			calendarId: HumanResourcesWorkCalendarId;
			expectedVersion: number;
			predecessorEffectiveTo: string;
		},
		ports: MutationPorts,
	) => Promise<Result<{ superseded: WorkCalendar; successor: WorkCalendar }>>;

	updateShift: (
		input: {
			organizationId: string;
			shiftId: HumanResourcesShiftId;
			name?: string | undefined;
			shiftKind?: ShiftKind | undefined;
			startLocal?: string | undefined;
			endLocal?: string | undefined;
			isOvernight?: boolean | undefined;
			expectedMinutes?: number | undefined;
			graceEarlyMinutes?: number | undefined;
			graceLateMinutes?: number | undefined;
			minDurationMinutes?: number | null | undefined;
			maxDurationMinutes?: number | null | undefined;
			earliestClockInLocal?: string | null | undefined;
			latestClockOutLocal?: string | null | undefined;
			overtimeEligible?: boolean | undefined;
			timezone?: string | null | undefined;
			locationKey?: string | null | undefined;
			effectiveTo?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<Shift>>;

	updateTimesheetEntry: (
		input: {
			organizationId: string;
			entryId: HumanResourcesTimesheetEntryId;
			workDate?: string | undefined;
			timeType?: TimesheetEntryTimeType | undefined;
			startedAt?: Date | null | undefined;
			endedAt?: Date | null | undefined;
			recordedMinutes?: number | undefined;
			approvedMinutes?: number | undefined;
			costCenterId?: string | null | undefined;
			projectId?: string | null | undefined;
			locationId?: string | null | undefined;
			departmentId?: string | null | undefined;
			approvalReference?: string | null | undefined;
			evidenceReference?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<TimesheetEntry>>;

	updateWorkCalendar: (
		input: {
			organizationId: string;
			calendarId: HumanResourcesWorkCalendarId;
			name?: string | undefined;
			timezone?: string | undefined;
			calendarVersion?: string | undefined;
			workWeek?: readonly WorkWeekDayPatternJson[] | undefined;
			standardHoursPerDay?: string | undefined;
			effectiveTo?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<WorkCalendar>>;

	verifyOvertimeRequest: (
		input: {
			organizationId: string;
			requestId: HumanResourcesOvertimeRequestId;
			payrollApprovedMinutes: number;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<OvertimeRequest>>;

	voidAttendanceEvent: (
		input: {
			organizationId: string;
			eventId: HumanResourcesAttendanceEventId;
			voidReason: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<AttendanceEvent>>;
}
