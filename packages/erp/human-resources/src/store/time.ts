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

export type TimesheetGenerationDeps = {
	approvedLeave: ApprovedLeaveQueryPort;
	workCalendar: WorkCalendarPort;
};

export type TimePolicyCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	minimumRestMinutes: number;
	automaticBreakAfterMinutes: number | null;
	automaticBreakMinutes: number;
	approvalSteps: readonly TimeApprovalAuthority[];
	idempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	correlationId: string;
};

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

export type WorkCalendarCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	timezone: string;
	calendarVersion: string;
	workWeek: readonly WorkWeekDayPatternJson[];
	standardHoursPerDay: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	idempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	correlationId: string;
};

export type WorkCalendarHolidayCreateRecord = {
	organizationId: string;
	calendarId: HumanResourcesWorkCalendarId;
	holidayDate: string;
	label: string | null;
	locationCode: string | null;
	jurisdiction: string | null;
	overrideKind: WorkCalendarDateOverrideKind;
	isWorkingDay: boolean;
	expectedMinutes: number | null;
	createdBy: string;
	correlationId: string;
};

export type EmploymentCalendarAssignRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	calendarId: HumanResourcesWorkCalendarId;
	effectiveFrom: string;
	effectiveTo: string | null;
	locationCode: string | null;
	jurisdiction: string | null;
	createdBy: string;
	correlationId: string;
};

export type WorkCalendarScopeAssignRecord = {
	organizationId: string;
	scopeType: import("../types").WorkCalendarScopeType;
	scopeKey: string;
	calendarId: HumanResourcesWorkCalendarId;
	effectiveFrom: string;
	effectiveTo: string | null;
	createdBy: string;
	correlationId: string;
};

export type ShiftBreakCreateRecord = {
	organizationId: string;
	shiftId: HumanResourcesShiftId;
	breakOrder: number;
	startOffsetMinutes: number | null;
	durationMinutes: number;
	isPaid: boolean;
	label: string | null;
	correlationId: string;
};

export type ShiftAssignmentCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	shiftId: HumanResourcesShiftId;
	scheduledDate: string;
	startsAt: Date;
	endsAt: Date;
	locationKey: string | null;
	timezone: string;
	assignmentSource: string;
	segments: readonly {
		segmentOrder: number;
		startsAt: Date;
		endsAt: Date;
	}[];
	idempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	correlationId: string;
};

export type AttendanceExceptionCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	sessionId: HumanResourcesAttendanceSessionId | null;
	eventId: HumanResourcesAttendanceEventId | null;
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
	exceptionType: AttendanceExceptionType;
	severity: "info" | "warning" | "critical";
	remarks: string | null;
	createdBy: string;
	correlationId: string;
};

export type TimesheetEntryCreateRecord = {
	organizationId: string;
	timesheetId: HumanResourcesTimesheetId;
	employeeId: HumanResourcesEmployeeId;
	workDate: string;
	timezone: string;
	sourceType: TimesheetEntrySourceType;
	sourceReference: string | null;
	timeType: TimesheetEntryTimeType;
	startedAt: Date | null;
	endedAt: Date | null;
	recordedMinutes: number;
	approvedMinutes: number;
	costCenterId: string | null;
	projectId: string | null;
	locationId: string | null;
	departmentId: string | null;
	approvalReference: string | null;
	evidenceReference: string | null;
	createdBy: string;
	correlationId: string;
};

export type OvertimeRequestCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	overtimeType: OvertimeType;
	requestedStartsAt: Date;
	requestedEndsAt: Date;
	requestedMinutes: number;
	reason: string;
	evidenceReference: string | null;
	idempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	correlationId: string;
};

export type HumanResourcesTimeStore = {
	// Work calendar
	findWorkCalendarByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentWorkCalendarRecord | null>>;

	createWorkCalendar(
		input: WorkCalendarCreateRecord,
		ports: MutationPorts,
	): Promise<Result<WorkCalendar>>;

	supersedeWorkCalendar(
		input: WorkCalendarCreateRecord & {
			calendarId: HumanResourcesWorkCalendarId;
			expectedVersion: number;
			predecessorEffectiveTo: string;
		},
		ports: MutationPorts,
	): Promise<Result<{ superseded: WorkCalendar; successor: WorkCalendar }>>;

	updateWorkCalendar(
		input: {
			organizationId: string;
			calendarId: HumanResourcesWorkCalendarId;
			name?: string;
			timezone?: string;
			calendarVersion?: string;
			workWeek?: readonly WorkWeekDayPatternJson[];
			standardHoursPerDay?: string;
			effectiveTo?: string | null;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<WorkCalendar>>;

	archiveWorkCalendar(
		input: {
			organizationId: string;
			calendarId: HumanResourcesWorkCalendarId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<WorkCalendar>>;

	getWorkCalendar(input: {
		organizationId: string;
		calendarId: HumanResourcesWorkCalendarId;
	}): Promise<Result<WorkCalendar | null>>;

	listWorkCalendars(input: {
		organizationId: string;
		status?: "active" | "superseded" | "archived";
		page?: number;
		pageSize?: number;
	}): Promise<Result<WorkCalendar[]>>;

	addWorkCalendarHoliday(
		input: WorkCalendarHolidayCreateRecord,
		ports: MutationPorts,
	): Promise<Result<WorkCalendarHolidayRecord>>;

	removeWorkCalendarHoliday(
		input: {
			organizationId: string;
			holidayId: HumanResourcesWorkCalendarHolidayId;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<void>>;

	listWorkCalendarHolidays(input: {
		organizationId: string;
		calendarId: HumanResourcesWorkCalendarId;
		fromDate?: string;
		toDate?: string;
	}): Promise<Result<WorkCalendarHolidayRecord[]>>;

	assignEmploymentCalendar(
		input: EmploymentCalendarAssignRecord,
		ports: MutationPorts,
	): Promise<Result<EmploymentCalendarAssignment>>;

	endEmploymentCalendarAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesEmploymentCalendarAssignmentId;
			effectiveTo: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<EmploymentCalendarAssignment>>;

	resolveEmploymentCalendar(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}): Promise<Result<EmploymentCalendarAssignment | null>>;

	listWorkCalendarScopeAssignments(input: {
		organizationId: string;
		asOf: string;
	}): Promise<Result<WorkCalendarScopeAssignment[]>>;

	assignWorkCalendarScope(
		input: WorkCalendarScopeAssignRecord,
		ports: MutationPorts,
	): Promise<Result<WorkCalendarScopeAssignment>>;

	endWorkCalendarScopeAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesWorkCalendarScopeAssignmentId;
			effectiveTo: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<WorkCalendarScopeAssignment>>;

	findTimePolicyByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<
		Result<{
			policy: TimePolicy;
			createRequestFingerprint: string;
		} | null>
	>;

	createTimePolicy(
		input: TimePolicyCreateRecord,
		ports: MutationPorts,
	): Promise<Result<TimePolicy>>;

	supersedeTimePolicy(
		input: TimePolicyCreateRecord & {
			policyId: HumanResourcesTimePolicyId;
			expectedVersion: number;
			predecessorEffectiveTo: string;
		},
		ports: MutationPorts,
	): Promise<Result<{ superseded: TimePolicy; successor: TimePolicy }>>;

	activateTimePolicy(
		input: {
			organizationId: string;
			policyId: HumanResourcesTimePolicyId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<TimePolicy>>;

	assignTimePolicy(
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
	): Promise<Result<TimePolicyAssignment>>;

	getTimePolicy(input: {
		organizationId: string;
		policyId: HumanResourcesTimePolicyId;
	}): Promise<Result<TimePolicy | null>>;

	resolveTimePolicy(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}): Promise<Result<TimePolicy | null>>;

	assignTimeApprovalAuthority(
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
	): Promise<Result<TimeApprovalAuthorityAssignment>>;

	endTimeApprovalAuthorityAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesTimeApprovalAuthorityAssignmentId;
			effectiveTo: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<TimeApprovalAuthorityAssignment>>;

	resolveTimeApprovalAuthority(input: {
		organizationId: string;
		actorUserId: string;
		authority: TimeApprovalAuthority;
		asOf: string;
	}): Promise<Result<TimeApprovalAuthorityAssignment | null>>;

	// Shift definition
	findShiftByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentShiftRecord | null>>;

	createShift(
		input: ShiftCreateRecord,
		ports: MutationPorts,
	): Promise<Result<Shift>>;

	supersedeShift(
		input: ShiftCreateRecord & {
			shiftId: HumanResourcesShiftId;
			expectedVersion: number;
			predecessorEffectiveTo: string;
		},
		ports: MutationPorts,
	): Promise<Result<{ superseded: Shift; successor: Shift }>>;

	updateShift(
		input: {
			organizationId: string;
			shiftId: HumanResourcesShiftId;
			name?: string;
			shiftKind?: ShiftKind;
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
			effectiveTo?: string | null;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<Shift>>;

	activateShift(
		input: {
			organizationId: string;
			shiftId: HumanResourcesShiftId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<Shift>>;

	deactivateShift(
		input: {
			organizationId: string;
			shiftId: HumanResourcesShiftId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<Shift>>;

	getShift(input: {
		organizationId: string;
		shiftId: HumanResourcesShiftId;
	}): Promise<Result<Shift | null>>;

	listShifts(input: {
		organizationId: string;
		status?: "draft" | "active" | "superseded" | "inactive";
		page?: number;
		pageSize?: number;
	}): Promise<Result<Shift[]>>;

	addShiftBreak(
		input: ShiftBreakCreateRecord,
		ports: MutationPorts,
	): Promise<Result<ShiftBreak>>;

	removeShiftBreak(
		input: {
			organizationId: string;
			breakId: HumanResourcesShiftBreakId;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<void>>;

	listShiftBreaks(input: {
		organizationId: string;
		shiftId: HumanResourcesShiftId;
	}): Promise<Result<ShiftBreak[]>>;

	// Shift assignment / scheduling
	findShiftAssignmentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentShiftAssignmentRecord | null>>;

	assignShift(
		input: ShiftAssignmentCreateRecord,
		ports: MutationPorts,
	): Promise<Result<ShiftAssignment>>;

	publishShiftAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesShiftAssignmentId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<ShiftAssignment>>;

	cancelShiftAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesShiftAssignmentId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<ShiftAssignment>>;

	changeShiftAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesShiftAssignmentId;
			shiftId?: HumanResourcesShiftId;
			scheduledDate?: string;
			startsAt?: Date;
			endsAt?: Date;
			locationKey?: string | null;
			timezone?: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<ShiftAssignment>>;

	completeShiftAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesShiftAssignmentId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<ShiftAssignment>>;

	getShiftAssignment(input: {
		organizationId: string;
		assignmentId: HumanResourcesShiftAssignmentId;
	}): Promise<Result<ShiftAssignment | null>>;

	listShiftAssignments(input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId;
		fromDate?: string;
		toDate?: string;
		scheduledDate?: string;
		locationKey?: string;
		publicationStatus?: ShiftAssignment["publicationStatus"];
		page?: number;
		pageSize?: number;
	}): Promise<Result<ShiftAssignment[]>>;

	listShiftAssignmentSegments(input: {
		organizationId: string;
		assignmentId: HumanResourcesShiftAssignmentId;
	}): Promise<Result<ShiftAssignmentSegment[]>>;

	getScheduledShiftForEmployeeDate(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		scheduledDate: string;
	}): Promise<Result<ShiftAssignment | null>>;

	listLocationSchedule(input: {
		organizationId: string;
		locationKey: string;
		fromDate?: string;
		toDate?: string;
		publicationStatus?: ShiftAssignment["publicationStatus"];
		page?: number;
		pageSize?: number;
	}): Promise<Result<ShiftAssignment[]>>;

	findOverlappingShiftAssignments(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		startsAt: Date;
		endsAt: Date;
		excludeAssignmentId?: HumanResourcesShiftAssignmentId;
	}): Promise<Result<ShiftAssignment[]>>;

	// Attendance events
	findAttendanceEventByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentAttendanceEventRecord | null>>;

	findAttendanceEventBySourceReference(input: {
		organizationId: string;
		source: AttendanceEventSource;
		sourceReference: string;
	}): Promise<Result<IdempotentAttendanceEventRecord | null>>;

	findAttendanceImportBatchByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentAttendanceImportBatchRecord | null>>;

	importAttendanceEvents(
		input: AttendanceImportBatchInput,
		ports: MutationPorts,
	): Promise<Result<AttendanceImportResult>>;

	recordAttendanceEvent(
		input: AttendanceEventRecordInput,
		ports: MutationPorts,
	): Promise<Result<AttendanceEvent>>;

	correctAttendanceEvent(
		input: {
			organizationId: string;
			eventId: HumanResourcesAttendanceEventId;
			occurredAt: Date;
			notes?: string | null;
			adjustmentReason: string;
			evidenceReference?: string | null;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<AttendanceEvent>>;

	voidAttendanceEvent(
		input: {
			organizationId: string;
			eventId: HumanResourcesAttendanceEventId;
			voidReason: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<AttendanceEvent>>;

	getAttendanceEvent(input: {
		organizationId: string;
		eventId: HumanResourcesAttendanceEventId;
	}): Promise<Result<AttendanceEvent | null>>;

	listAttendanceAdjustments(input: {
		organizationId: string;
		eventId: HumanResourcesAttendanceEventId;
	}): Promise<Result<AttendanceAdjustment[]>>;

	listAttendanceEvents(input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId;
		fromDate?: string;
		toDate?: string;
		eventType?: AttendanceEventType;
		page?: number;
		pageSize?: number;
	}): Promise<Result<AttendanceEvent[]>>;

	// Attendance sessions
	findAttendanceSessionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentAttendanceSessionRecord | null>>;

	resolveAttendanceSession(
		input: AttendanceSessionResolveInput,
		ports: MutationPorts,
	): Promise<Result<AttendanceSession>>;

	getAttendanceSession(input: {
		organizationId: string;
		sessionId: HumanResourcesAttendanceSessionId;
	}): Promise<Result<AttendanceSession | null>>;

	approveAttendanceBreakWaiver(
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
	): Promise<Result<AttendanceBreakWaiverDecision>>;

	listAttendanceBreakWaiverDecisions(input: {
		organizationId: string;
		sessionId: HumanResourcesAttendanceSessionId;
	}): Promise<Result<AttendanceBreakWaiverDecision[]>>;

	listAttendanceSessions(input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId;
		fromDate?: string;
		toDate?: string;
		page?: number;
		pageSize?: number;
	}): Promise<Result<AttendanceSession[]>>;

	getPreviousCompletedAttendanceSession(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		before: Date;
		excludeSessionId: HumanResourcesAttendanceSessionId;
	}): Promise<Result<AttendanceSession | null>>;

	// Attendance exceptions
	createAttendanceException(
		input: AttendanceExceptionCreateRecord,
		ports: MutationPorts,
	): Promise<Result<AttendanceException>>;

	reviewAttendanceException(
		input: {
			organizationId: string;
			exceptionId: HumanResourcesAttendanceExceptionId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<AttendanceException>>;

	excuseAttendanceException(
		input: {
			organizationId: string;
			exceptionId: HumanResourcesAttendanceExceptionId;
			resolution: string;
			evidenceReference?: string | null;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<AttendanceException>>;

	rejectAttendanceException(
		input: {
			organizationId: string;
			exceptionId: HumanResourcesAttendanceExceptionId;
			resolution: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<AttendanceException>>;

	resolveAttendanceException(
		input: {
			organizationId: string;
			exceptionId: HumanResourcesAttendanceExceptionId;
			resolution: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<AttendanceException>>;

	getAttendanceException(input: {
		organizationId: string;
		exceptionId: HumanResourcesAttendanceExceptionId;
	}): Promise<Result<AttendanceException | null>>;

	listAttendanceExceptions(input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId;
		reviewStatus?: AttendanceException["reviewStatus"];
		page?: number;
		pageSize?: number;
	}): Promise<Result<AttendanceException[]>>;

	listUnresolvedAttendanceExceptions(input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId;
		page?: number;
		pageSize?: number;
	}): Promise<Result<AttendanceException[]>>;

	getDailyAttendanceSummary(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		localWorkDate: string;
		timezone: string;
	}): Promise<Result<DailyAttendanceSummary>>;

	// Timesheet
	findTimesheetByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentTimesheetRecord | null>>;

	createTimesheet(
		input: TimesheetCreateRecord,
		ports: MutationPorts,
	): Promise<Result<Timesheet>>;

	generateTimesheetEntries(
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
		deps: TimesheetGenerationDeps,
	): Promise<Result<{ timesheet: Timesheet; entries: TimesheetEntry[] }>>;

	addTimesheetEntry(
		input: TimesheetEntryCreateRecord,
		ports: MutationPorts,
	): Promise<Result<TimesheetEntry>>;

	updateTimesheetEntry(
		input: {
			organizationId: string;
			entryId: HumanResourcesTimesheetEntryId;
			workDate?: string;
			timeType?: TimesheetEntryTimeType;
			startedAt?: Date | null;
			endedAt?: Date | null;
			recordedMinutes?: number;
			approvedMinutes?: number;
			costCenterId?: string | null;
			projectId?: string | null;
			locationId?: string | null;
			departmentId?: string | null;
			approvalReference?: string | null;
			evidenceReference?: string | null;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<TimesheetEntry>>;

	removeTimesheetEntry(
		input: {
			organizationId: string;
			entryId: HumanResourcesTimesheetEntryId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<void>>;

	submitTimesheet(
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
	): Promise<Result<Timesheet>>;

	returnTimesheet(
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			approverNotes?: string | null;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<Timesheet>>;

	approveTimesheet(
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			approverNotes?: string | null;
			authority: TimeApprovalAuthority;
			authorityAssignmentId: HumanResourcesTimeApprovalAuthorityAssignmentId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<Timesheet>>;

	listTimesheetApprovalDecisions(input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
		submissionReference?: string;
	}): Promise<Result<TimesheetApprovalDecision[]>>;

	rejectTimesheet(
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			rejectionReason: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<Timesheet>>;

	reopenTimesheet(
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<Timesheet>>;

	lockTimesheet(
		input: {
			organizationId: string;
			timesheetId: HumanResourcesTimesheetId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<Timesheet>>;

	supersedeTimesheet(
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
	): Promise<Result<Timesheet>>;

	getTimesheet(input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
	}): Promise<Result<Timesheet | null>>;

	findTimesheetForEmployeePeriod(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		periodStart: string;
		periodEnd: string;
	}): Promise<Result<Timesheet | null>>;

	listTimesheets(input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId;
		status?: TimesheetStatus;
		periodStart?: string;
		page?: number;
		pageSize?: number;
	}): Promise<Result<Timesheet[]>>;

	listTimesheetEntries(input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
	}): Promise<Result<TimesheetEntry[]>>;

	getTimesheetTotals(input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
	}): Promise<Result<TimesheetTotals | null>>;

	getApprovedTimeHandoff(input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
	}): Promise<Result<ApprovedTimeHandoff | null>>;

	// Overtime
	findOvertimeRequestByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOvertimeRequestRecord | null>>;

	createOvertimeRequest(
		input: OvertimeRequestCreateRecord,
		ports: MutationPorts,
	): Promise<Result<OvertimeRequest>>;

	approveOvertimeRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesOvertimeRequestId;
			approvedMaximumMinutes: number;
			comment?: string | null;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<OvertimeRequest>>;

	rejectOvertimeRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesOvertimeRequestId;
			comment: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<OvertimeRequest>>;

	cancelOvertimeRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesOvertimeRequestId;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<OvertimeRequest>>;

	recordOvertimeActual(
		input: {
			organizationId: string;
			requestId: HumanResourcesOvertimeRequestId;
			actualMinutes: number;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<OvertimeRequest>>;

	verifyOvertimeRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesOvertimeRequestId;
			payrollApprovedMinutes: number;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<OvertimeRequest>>;

	getOvertimeRequest(input: {
		organizationId: string;
		requestId: HumanResourcesOvertimeRequestId;
	}): Promise<Result<OvertimeRequest | null>>;

	listOvertimeRequests(input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId;
		status?: OvertimeRequest["status"];
		page?: number;
		pageSize?: number;
	}): Promise<Result<OvertimeRequest[]>>;
};
